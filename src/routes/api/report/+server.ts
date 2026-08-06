import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

/**
 * Turns an in-app report into a GitHub issue.
 *
 * Reports are anonymous: nobody needs a GitHub account, and none is asked
 * for. The issue is filed by the repo owner's token, so every report arrives
 * under one identity - which means the body has to carry everything needed to
 * act on it, since there is no author to ask.
 *
 * Configure with two secrets, neither of which ships in the repo:
 *   npx wrangler pages secret put GITHUB_TOKEN     # fine-grained, issues:write
 *   npx wrangler pages secret put GITHUB_REPO      # owner/name
 * Without them the endpoint reports itself unavailable and the UI falls back
 * to a plain link to the tracker.
 */

/** Long enough to be actionable, short enough to stay a report. */
const MAX_MESSAGE = 4000;
const MAX_CONTEXT = 400;

/** Per-IP, per-hour. High enough that a genuine reporting spree is fine. */
const HOURLY_LIMIT = 5;

const KINDS = {
	bug: 'Bug report',
	location: 'Location correction'
} as const;
type Kind = keyof typeof KINDS;

export const POST: RequestHandler = async (event) => {
	const token = event.platform?.env?.GITHUB_TOKEN;
	const repo = event.platform?.env?.GITHUB_REPO;
	if (!token || !repo) throw error(503, 'Reporting is not configured on this deployment.');

	const body = await event.request.json().catch(() => null);
	if (!body || typeof body !== 'object') throw error(400, 'Malformed report.');

	const kind: Kind = body.kind === 'location' ? 'location' : 'bug';
	const message = typeof body.message === 'string' ? body.message.trim() : '';
	if (message.length < 10) throw error(400, 'Please describe the problem in a sentence or two.');
	if (message.length > MAX_MESSAGE) throw error(400, 'That report is too long.');

	/* Set by the store sheet: which location the reporter was looking at. */
	const subject = typeof body.subject === 'string' ? body.subject.slice(0, MAX_CONTEXT) : '';
	const storeId = typeof body.storeId === 'string' ? body.storeId.slice(0, 120) : '';

	await enforceRateLimit(event);

	const title = subject
		? `${KINDS[kind]}: ${subject}`
		: `${KINDS[kind]}: ${firstLine(message)}`;

	const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
		method: 'POST',
		headers: {
			authorization: `Bearer ${token}`,
			accept: 'application/vnd.github+json',
			'content-type': 'application/json',
			/* GitHub rejects requests without one. */
			'user-agent': 'timmies-passport-reporter'
		},
		body: JSON.stringify({
			title: title.slice(0, 240),
			body: issueBody({ kind, message, subject, storeId, event }),
			labels: [kind === 'location' ? 'location' : 'bug', 'from-app']
		})
	});

	if (!res.ok) {
		/* The reporter cannot fix a bad token, so do not show them the detail. */
		console.error('GitHub issue create failed', res.status, await res.text());
		throw error(502, 'Could not file the report. Please try again later.');
	}

	const issue = (await res.json()) as { number: number; html_url: string };
	return json({ number: issue.number, url: issue.html_url });
};

function firstLine(message: string): string {
	const line = message.split('\n', 1)[0].trim();
	return line.length > 80 ? `${line.slice(0, 77)}...` : line;
}

/**
 * Everything a maintainer needs, and nothing that identifies the reporter.
 * The user agent is the one exception - it is what makes a rendering bug
 * reproducible - and it is recorded without the IP it arrived with.
 */
function issueBody(o: {
	kind: Kind;
	message: string;
	subject: string;
	storeId: string;
	event: Parameters<RequestHandler>[0];
}): string {
	const ua = o.event.request.headers.get('user-agent') ?? 'unknown';
	const parts = [quote(o.message), '', '---'];
	if (o.subject) parts.push(`**Location:** ${o.subject}`);
	if (o.storeId) parts.push(`**Store ID:** \`${o.storeId}\``);
	parts.push(`**Browser:** \`${ua.slice(0, 300)}\``);
	parts.push(`**Received:** ${new Date().toISOString()}`);
	parts.push('', '_Filed anonymously through the in-app report form._');
	return parts.join('\n');
}

/** Blockquoted so a report can never inject headings or task lists. */
function quote(message: string): string {
	return message
		.split('\n')
		.map((line) => `> ${line}`)
		.join('\n');
}

/**
 * Cheap abuse brake. Keyed on a salted hash of the IP rather than the IP, so
 * the table cannot be read back as a list of who reported what. Best-effort:
 * with no database configured the endpoint still works, because losing
 * reports is worse than the risk of an unthrottled one.
 */
async function enforceRateLimit(event: Parameters<RequestHandler>[0]) {
	const db = getDb(event);
	if (!db) return;

	const ip = event.request.headers.get('cf-connecting-ip') ?? 'unknown';
	const key = await sha256(`report:${ip}`);
	const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

	const row = await db
		.prepare('SELECT COUNT(*) AS n FROM reports WHERE reporter_key = ? AND created_at > ?')
		.bind(key, since)
		.first<{ n: number }>();

	if ((row?.n ?? 0) >= HOURLY_LIMIT) {
		throw error(429, 'That is a lot of reports in one hour. Please try again later.');
	}

	await db
		.prepare('INSERT INTO reports (reporter_key, created_at) VALUES (?, ?)')
		.bind(key, new Date().toISOString())
		.run();
}

async function sha256(input: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

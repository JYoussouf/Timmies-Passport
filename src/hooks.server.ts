import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { SITE_URL } from '$lib/brand';

/** Resolve the signed-in user (if any) from the session cookie into locals. */
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.user = null;
	const token = event.cookies.get(SESSION_COOKIE);
	const db = getDb(event);

	if (token && db) {
		const row = await db
			.prepare(
				`SELECT u.id, u.email, u.display_name, s.expires_at
				 FROM sessions s JOIN users u ON u.id = s.user_id
				 WHERE s.id = ?`
			)
			.bind(token)
			.first<{ id: string; email: string; display_name: string; expires_at: string }>();

		if (row && row.expires_at > new Date().toISOString()) {
			event.locals.user = { id: row.id, email: row.email, displayName: row.display_name };
		}
	}

	const response = await resolve(event);

	/*
	 * Canonical URL, on the response itself.
	 *
	 * The app renders client-side, so the <link> in the layout only exists
	 * once JavaScript has run - too late for a crawler that does not execute
	 * it. static/_headers cannot do this either: Pages applies header rules to
	 * static assets, and every page here is served by the worker.
	 *
	 * Emitted on the pages.dev host too, which is the whole point - both
	 * addresses serve, and both should name the domain as the one true home.
	 */
	if (response.headers.get('content-type')?.startsWith('text/html')) {
		response.headers.append(
			'link',
			`<${SITE_URL}${event.url.pathname.replace(/\/$/, '')}>; rel="canonical"`
		);
	}

	return response;
};

import type { D1Database } from '@cloudflare/workers-types';
import type { RequestEvent } from '@sveltejs/kit';

export const SESSION_COOKIE = 'tp_session';
const SESSION_DAYS = 60;
const PBKDF2_ITERS = 100_000;

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function randomId(bytes = 18): string {
	const a = new Uint8Array(bytes);
	crypto.getRandomValues(a);
	return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2(password: string, saltHex: string): Promise<string> {
	const salt = Uint8Array.from(saltHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
	const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
		'deriveBits'
	]);
	const bits = await crypto.subtle.deriveBits(
		{ name: 'PBKDF2', salt, iterations: PBKDF2_ITERS, hash: 'SHA-256' },
		key,
		256
	);
	return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
	const saltHex = randomId(16);
	const hash = await pbkdf2(password, saltHex);
	return `${saltHex}:${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltHex, expected] = stored.split(':');
	if (!saltHex || !expected) return false;
	const actual = await pbkdf2(password, saltHex);
	// constant-ish time compare
	if (actual.length !== expected.length) return false;
	let diff = 0;
	for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
	return diff === 0;
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
	const id = randomId(24);
	const expires = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
	await db
		.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
		.bind(id, userId, expires)
		.run();
	return id;
}

export function setSessionCookie(event: RequestEvent, id: string) {
	event.cookies.set(SESSION_COOKIE, id, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: SESSION_DAYS * 86400
	});
}

export function clearSessionCookie(event: RequestEvent) {
	event.cookies.delete(SESSION_COOKIE, { path: '/' });
}

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { SESSION_COOKIE, clearSessionCookie } from '$lib/server/auth';

export const POST: RequestHandler = async (event) => {
	const token = event.cookies.get(SESSION_COOKIE);
	const db = getDb(event);
	if (token && db) await db.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run();
	clearSessionCookie(event);
	return json({ ok: true });
};

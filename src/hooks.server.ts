import type { Handle } from '@sveltejs/kit';
import { SESSION_COOKIE } from '$lib/server/auth';
import { getDb } from '$lib/server/db';

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

	return resolve(event);
};

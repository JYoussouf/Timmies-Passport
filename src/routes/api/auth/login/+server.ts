import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireDb } from '$lib/server/db';
import { verifyPassword, createSession, setSessionCookie } from '$lib/server/auth';
import { mergeVisits, loadVisits } from '$lib/server/visits';

export const POST: RequestHandler = async (event) => {
	const db = requireDb(event);
	const { email, password, visits } = await event.request.json();

	if (typeof email !== 'string' || typeof password !== 'string')
		throw error(400, 'Missing credentials.');

	const user = await db
		.prepare('SELECT id, email, password_hash, display_name FROM users WHERE email = ?')
		.bind(email.toLowerCase())
		.first<{ id: string; email: string; password_hash: string; display_name: string }>();

	if (!user || !(await verifyPassword(password, user.password_hash)))
		throw error(401, 'Wrong email or password.');

	// Fold any local progress made before signing in into the cloud record.
	if (visits) await mergeVisits(db, user.id, visits);

	const session = await createSession(db, user.id);
	setSessionCookie(event, session);

	return json({
		user: { id: user.id, email: user.email, displayName: user.display_name },
		visits: await loadVisits(db, user.id)
	});
};

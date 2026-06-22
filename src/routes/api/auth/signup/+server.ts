import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireDb } from '$lib/server/db';
import {
	hashPassword,
	createSession,
	setSessionCookie,
	randomId
} from '$lib/server/auth';
import { mergeVisits } from '$lib/server/visits';

export const POST: RequestHandler = async (event) => {
	const db = requireDb(event);
	const { email, password, displayName, visits } = await event.request.json();

	if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
		throw error(400, 'Enter a valid email.');
	if (typeof password !== 'string' || password.length < 6)
		throw error(400, 'Password must be at least 6 characters.');

	const existing = await db
		.prepare('SELECT id FROM users WHERE email = ?')
		.bind(email.toLowerCase())
		.first();
	if (existing) throw error(409, 'That email already has a passport.');

	const id = randomId(16);
	const name = (typeof displayName === 'string' && displayName.trim()) || email.split('@')[0];
	await db
		.prepare(
			'INSERT INTO users (id, email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?)'
		)
		.bind(id, email.toLowerCase(), await hashPassword(password), name, new Date().toISOString())
		.run();

	if (visits) await mergeVisits(db, id, visits);

	const session = await createSession(db, id);
	setSessionCookie(event, session);

	return json({ user: { id, email: email.toLowerCase(), displayName: name } });
};

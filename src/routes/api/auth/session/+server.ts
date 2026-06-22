import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { loadVisits } from '$lib/server/visits';

export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) return json({ user: null });
	const db = getDb(event);
	const visits = db ? await loadVisits(db, user.id) : {};
	return json({ user, visits });
};

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireDb } from '$lib/server/db';
import { recount } from '$lib/server/visits';

/** Toggle / annotate a single check-in for the signed-in user. */
export const POST: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) throw error(401, 'Sign in to sync.');
	const db = requireDb(event);
	const { locationId, checkedIn, note } = await event.request.json();
	if (typeof locationId !== 'string') throw error(400, 'Missing locationId.');

	if (checkedIn) {
		await db
			.prepare(
				`INSERT INTO visits (user_id, location_id, visited_at, note)
				 VALUES (?, ?, ?, ?)
				 ON CONFLICT(user_id, location_id) DO UPDATE SET note = excluded.note`
			)
			.bind(user.id, locationId, new Date().toISOString(), typeof note === 'string' ? note : '')
			.run();
	} else {
		await db
			.prepare('DELETE FROM visits WHERE user_id = ? AND location_id = ?')
			.bind(user.id, locationId)
			.run();
	}

	await recount(db, [locationId]);
	const row = await db
		.prepare('SELECT check_in_count FROM locations WHERE id = ?')
		.bind(locationId)
		.first<{ check_in_count: number }>();
	return json({ checkInCount: row?.check_in_count ?? 0 });
};

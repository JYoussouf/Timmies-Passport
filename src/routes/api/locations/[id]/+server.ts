import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

export const GET: RequestHandler = async (event) => {
	const db = getDb(event);
	if (!db) return json({ checkInCount: 0 });
	const row = await db
		.prepare('SELECT check_in_count FROM locations WHERE id = ?')
		.bind(event.params.id)
		.first<{ check_in_count: number }>();
	return json({ checkInCount: row?.check_in_count ?? 0 });
};

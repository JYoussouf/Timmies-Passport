import type { D1Database } from '@cloudflare/workers-types';
import type { Visits } from '$lib/types';

/** Recompute the public check_in_count for the given locations from `visits`.
 *  Idempotent - safe to call after any sync/toggle. */
export async function recount(db: D1Database, locationIds: string[]) {
	const ids = [...new Set(locationIds)].filter(Boolean);
	if (!ids.length) return;
	for (let i = 0; i < ids.length; i += 50) {
		const chunk = ids.slice(i, i + 50);
		const placeholders = chunk.map(() => '?').join(',');
		await db
			.prepare(
				`UPDATE locations SET check_in_count =
					(SELECT COUNT(*) FROM visits WHERE visits.location_id = locations.id)
				 WHERE id IN (${placeholders})`
			)
			.bind(...chunk)
			.run();
	}
}

/** Merge a batch of client-side visits into a user's cloud record. */
export async function mergeVisits(db: D1Database, userId: string, visits: Visits) {
	const entries = Object.entries(visits ?? {}).slice(0, 20000);
	if (!entries.length) return;
	const stmts = entries.map(([locationId, v]) =>
		db
			.prepare(
				`INSERT INTO visits (user_id, location_id, visited_at, note)
				 VALUES (?, ?, ?, ?)
				 ON CONFLICT(user_id, location_id) DO UPDATE SET
				   note = CASE WHEN excluded.note != '' THEN excluded.note ELSE visits.note END`
			)
			.bind(userId, locationId, v.visitedAt ?? new Date().toISOString(), v.note ?? '')
	);
	await db.batch(stmts);
	await recount(db, entries.map(([id]) => id));
}

/** Load a user's full visit set as the client-side Visits shape. */
export async function loadVisits(db: D1Database, userId: string): Promise<Visits> {
	const { results } = await db
		.prepare('SELECT location_id, visited_at, note FROM visits WHERE user_id = ?')
		.bind(userId)
		.all<{ location_id: string; visited_at: string; note: string }>();
	const out: Visits = {};
	for (const r of results ?? []) out[r.location_id] = { visitedAt: r.visited_at, note: r.note };
	return out;
}

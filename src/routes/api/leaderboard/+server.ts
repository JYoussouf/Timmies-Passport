import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

export const GET: RequestHandler = async (event) => {
	const db = getDb(event);
	const empty = {
		topLocations: [],
		topCountries: [],
		totalCheckIns: 0,
		totalCollectors: 0
	};
	if (!db) return json(empty);

	const [topLoc, topCty, totals, collectors] = await db.batch([
		db.prepare(
			`SELECT id, name, city, region, check_in_count AS count
			 FROM locations WHERE check_in_count > 0
			 ORDER BY check_in_count DESC LIMIT 12`
		),
		db.prepare(
			`SELECT l.country_code, MAX(l.country) AS country,
			        COUNT(DISTINCT v.location_id) AS visited,
			        (SELECT COUNT(*) FROM locations l2 WHERE l2.country_code = l.country_code) AS total
			 FROM visits v JOIN locations l ON l.id = v.location_id
			 WHERE l.country_code != ''
			 GROUP BY l.country_code ORDER BY visited DESC LIMIT 10`
		),
		db.prepare('SELECT COUNT(*) AS n FROM visits'),
		db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM visits')
	]);

	return json({
		topLocations: topLoc.results ?? [],
		topCountries: topCty.results ?? [],
		totalCheckIns: (totals.results?.[0] as { n: number })?.n ?? 0,
		totalCollectors: (collectors.results?.[0] as { n: number })?.n ?? 0
	});
};

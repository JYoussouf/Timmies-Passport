import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';

interface PlayerRow {
	id: string;
	display_name: string;
	count: number;
}

export const GET: RequestHandler = async (event) => {
	const db = getDb(event);
	const empty = {
		topLocations: [],
		topCountries: [],
		topPlayers: [],
		me: null,
		totalCheckIns: 0,
		totalCollectors: 0
	};
	if (!db) return json(empty);

	const user = event.locals.user;

	const [topLoc, topCty, topPly, totals, collectors, myCount] = await db.batch([
		db.prepare(
			// Every store is named "Tim Hortons", so the address is what makes a
			// leaderboard row identifiable.
			`SELECT id, name, address, city, region, check_in_count AS count
			 FROM locations WHERE check_in_count > 0
			 ORDER BY check_in_count DESC LIMIT 5`
		),
		db.prepare(
			`SELECT l.country_code, MAX(l.country) AS country,
			        COUNT(DISTINCT v.location_id) AS visited,
			        (SELECT COUNT(*) FROM locations l2 WHERE l2.country_code = l.country_code) AS total
			 FROM visits v JOIN locations l ON l.id = v.location_id
			 WHERE l.country_code != ''
			 GROUP BY l.country_code ORDER BY visited DESC LIMIT 10`
		),
		db.prepare(
			`SELECT u.id, u.display_name, COUNT(*) AS count
			 FROM visits v JOIN users u ON u.id = v.user_id
			 GROUP BY v.user_id
			 ORDER BY count DESC LIMIT 10`
		),
		db.prepare('SELECT COUNT(*) AS n FROM visits'),
		db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM visits'),
		// A visitor's own count, fetched even when it will not land in the top
		// ten above - the leaderboard means to show where you stand, not just
		// who is winning.
		db.prepare('SELECT COUNT(*) AS n FROM visits WHERE user_id = ?').bind(user?.id ?? '')
	]);

	const topPlayers = (topPly.results ?? []) as unknown as PlayerRow[];

	/*
	 * Ranked in JS rather than SQL: a correlated subquery per row is simple
	 * and portable, and ten rows is nowhere near enough for the O(nΒ²) shape to
	 * matter. Ties share a rank and the next place skips - two players on 40
	 * stamps are both "3rd", not "3rd" and "4th" by coin flip.
	 */
	let me: { rank: number; count: number; displayName: string } | null = null;
	if (user) {
		const myTotal = (myCount.results?.[0] as { n: number })?.n ?? 0;
		if (myTotal > 0) {
			const inTop = topPlayers.find((p) => p.id === user.id);
			if (inTop) {
				const rank = topPlayers.filter((p) => p.count > inTop.count).length + 1;
				me = { rank, count: inTop.count, displayName: user.displayName };
			} else {
				const higher = await db
					.prepare(
						`SELECT COUNT(*) AS n FROM (
							SELECT user_id, COUNT(*) AS c FROM visits GROUP BY user_id
						 ) t WHERE t.c > ?`
					)
					.bind(myTotal)
					.first<{ n: number }>();
				me = { rank: (higher?.n ?? 0) + 1, count: myTotal, displayName: user.displayName };
			}
		}
	}

	return json({
		topLocations: topLoc.results ?? [],
		topCountries: topCty.results ?? [],
		topPlayers,
		me,
		totalCheckIns: (totals.results?.[0] as { n: number })?.n ?? 0,
		totalCollectors: (collectors.results?.[0] as { n: number })?.n ?? 0
	});
};

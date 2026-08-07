import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Street-name search, the last tier before "no results".
 *
 * The dataset only knows Tim Hortons and the cities that hold one, so
 * "Bert Budd Avenue" - a real street with no Timmies on it - had nowhere to
 * go. Nominatim knows every named road OpenStreetMap has mapped, which is
 * the same source the harvest's own reverse geocoding already leans on.
 *
 * Proxied rather than called from the browser so the request carries a
 * proper identifying User-Agent, which Nominatim's usage policy requires and
 * a client-side fetch cannot supply. This is also why it is a fallback and
 * not a live-as-you-type autocomplete: the policy asks for requests only on
 * a completed pause in typing, at no more than one a second, and the client
 * only calls this once the dataset and the gazetteer have both come up
 * empty - which most searches never reach.
 */

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const MAX_HITS = 8;

interface NominatimResult {
	name?: string;
	class?: string;
	addresstype?: string;
	address?: Record<string, string>;
	boundingbox?: [string, string, string, string];
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const q = (url.searchParams.get('q') ?? '').trim();
	if (q.length < 3) return json({ hits: [] });

	const params = new URLSearchParams({
		q,
		format: 'jsonv2',
		addressdetails: '1',
		limit: '10',
		dedupe: '1'
	});

	/*
	 * Biases toward the street a person is already looking at rather than a
	 * same-named one across the continent. `bounded=0` keeps it a preference,
	 * not a wall - a street just outside the current view should still be
	 * reachable.
	 */
	const near = url.searchParams.get('near');
	if (near) {
		const [lng, lat] = near.split(',').map(Number);
		if (Number.isFinite(lng) && Number.isFinite(lat)) {
			const pad = 2;
			params.set('viewbox', `${lng - pad},${lat + pad},${lng + pad},${lat - pad}`);
			params.set('bounded', '0');
		}
	}

	const res = await fetch(`${NOMINATIM}?${params}`, {
		headers: {
			'User-Agent': 'TimmiesPassport/0.1 (street search; contact: dev@timmiespassport.app)',
			'Accept-Language': 'en'
		}
	});
	if (!res.ok) throw error(502, 'Street search is unavailable right now.');

	const results = (await res.json()) as NominatimResult[];

	const hits = results
		.filter((r) => r.class === 'highway' || r.addresstype === 'road')
		.filter((r) => r.boundingbox)
		.slice(0, MAX_HITS)
		.map((r) => {
			const a = r.address ?? {};
			const place = a.city || a.town || a.village || a.hamlet || a.county;
			const region = a.state || a.province;
			const context = [place, region, a.country].filter(Boolean).join(', ');
			const [south, north, west, east] = r.boundingbox!.map(Number);
			return {
				name: r.name || a.road || q,
				context,
				bounds: [west, south, east, north] as [number, number, number, number]
			};
		});

	return json({ hits });
};

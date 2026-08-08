/**
 * Timmies Passport - restaurant updater
 * ---------------------------------------------------------------
 *   npm run update:restaurants
 *
 * Rebuilds the map's view of the world from two sources:
 *
 *   OpenStreetMap (via Overpass)  where stores are, and the stable id every
 *                                 stamp is keyed on. ODbL.
 *   Tim Hortons' own locator      which stores exist, via All The Places. CC0.
 *
 * OSM lags reality by months, so a store that has moved or shut can sit on the
 * map as open for a long time; the chain's own list is what settles it.
 *
 * Writes:
 *   static/locations.json   GeoJSON, served to the map
 *   static/cities.json      place gazetteer, for search
 *   scripts/seed.sql        D1 seed for the `locations` table
 *
 * Safe to run on a schedule. It never removes a location - stamps live in each
 * visitor's browser keyed on the id, so a store that closes is kept and marked
 * closed. Three consecutive runs should report no changes at all.
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** The script lives at the repo root; its caches and the seed stay in scripts/. */
const ROOT = __dirname;
const SCRIPTS = resolve(ROOT, 'scripts');

const ENDPOINTS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.kumi.systems/api/interpreter'
];

// brand:wikidata Q1057620 = Tim Hortons. Match by brand OR wikidata to be thorough.
const QUERY = `
[out:json][timeout:180];
(
  nwr["brand:wikidata"="Q1057620"];
  nwr["brand"="Tim Hortons"];
  nwr["disused:brand"="Tim Hortons"];
  nwr["was:brand"="Tim Hortons"];
);
out center tags;
`;

type OverpassElement = {
	type: 'node' | 'way' | 'relation';
	id: number;
	lat?: number;
	lon?: number;
	center?: { lat: number; lon: number };
	tags?: Record<string, string>;
	/* Present only on `out geom` responses, which the airport query uses. */
	geometry?: { lat: number; lon: number }[];
	members?: { role?: string; geometry?: { lat: number; lon: number }[] }[];
};

type Loc = {
	id: string;
	osm_id: string;
	name: string;
	lat: number;
	lng: number;
	address: string;
	city: string;
	region: string;
	country: string;
	country_code: string;
	/**
	 * Tombstoned rather than deleted. Someone may have stamped this store
	 * before it closed, and a passport must never lose an entry because the
	 * world changed.
	 */
	closed: boolean;
	/**
	 * The airport this store stands inside, when it stands inside one.
	 *
	 * Terminal stores carry addresses like "Terminal 1 Departures" in whatever
	 * municipality the runway happens to sit in - Pearson's are filed under
	 * Mississauga - so neither the airport's name nor its city appears
	 * anywhere in the record. Searching for one is hopeless without this.
	 */
	venue?: string;
};

// --- Offline reverse-geocoding via Natural Earth boundaries ----------------
// OSM almost never tags addr:country, so we derive country + region from the
// point's coordinates using point-in-polygon. Fetched once at harvest time.
// 50m, not 110m: at 110m the country outlines are so coarse that border towns
// land on the wrong side. Windsor sat inside the United States.
const NE_COUNTRIES =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const NE_REGIONS =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';

type Ring = number[][];
type Poly = Ring[];
type Area = {
	name: string;
	iso: string;
	/** For regions: the country that owns them, so the two can never disagree. */
	country?: string;
	bbox: [number, number, number, number];
	polys: Poly[];
};

function geomToPolys(geom: any): Poly[] {
	if (!geom) return [];
	if (geom.type === 'Polygon') return [geom.coordinates];
	if (geom.type === 'MultiPolygon') return geom.coordinates;
	return [];
}

function bboxOf(polys: Poly[]): [number, number, number, number] {
	let minX = 180,
		minY = 90,
		maxX = -180,
		maxY = -90;
	for (const poly of polys)
		for (const ring of poly)
			for (const [x, y] of ring) {
				if (x < minX) minX = x;
				if (y < minY) minY = y;
				if (x > maxX) maxX = x;
				if (y > maxY) maxY = y;
			}
	return [minX, minY, maxX, maxY];
}

function pointInRing(x: number, y: number, ring: Ring): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i][0],
			yi = ring[i][1],
			xj = ring[j][0],
			yj = ring[j][1];
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
	}
	return inside;
}

function pointInArea(x: number, y: number, area: Area): boolean {
	const [minX, minY, maxX, maxY] = area.bbox;
	if (x < minX || x > maxX || y < minY || y > maxY) return false;
	for (const poly of area.polys) {
		if (!pointInRing(x, y, poly[0])) continue;
		let inHole = false;
		for (let h = 1; h < poly.length; h++) if (pointInRing(x, y, poly[h])) inHole = true;
		if (!inHole) return true;
	}
	return false;
}

async function loadAreas(
	url: string,
	pick: (p: any) => { name: string; iso: string; country?: string }
): Promise<Area[]> {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'TimmiesPassport/0.1 boundaries' }
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const fc = (await res.json()) as { features: any[] };
	return fc.features.map((f) => {
		const polys = geomToPolys(f.geometry);
		const { name, iso, country } = pick(f.properties);
		return { name, iso, country, polys, bbox: bboxOf(polys) };
	});
}

async function buildGeocoder() {
	console.log('→ loading Natural Earth boundaries for reverse-geocoding …');
	const [countries, regions] = await Promise.all([
		loadAreas(NE_COUNTRIES, (p) => ({
			name: p.ADMIN || p.NAME || '',
			iso: (p.ISO_A2 !== '-99' ? p.ISO_A2 : p.ISO_A2_EH) || ''
		})),
		loadAreas(NE_REGIONS, (p) => ({
			name: p.name || '',
			// e.g. "CA-ON" - the first half is the country this region belongs to.
			iso: p.iso_3166_2 || '',
			country: p.admin || ''
		})).catch(() => [] as Area[])
	]);
	console.log(`  ${countries.length} countries, ${regions.length} regions loaded`);
	return (lng: number, lat: number) => {
		const region = regions.find((a) => pointInArea(lng, lat, a));
		// Prefer the country that owns the matched region: it comes from the same
		// polygon, so region and country cannot contradict each other. The
		// country outlines are only a fallback for points no region covers.
		if (region?.country && region.iso.length >= 2) {
			return {
				country: region.country,
				country_code: region.iso.slice(0, 2).toUpperCase(),
				region: region.name
			};
		}
		const country = countries.find((a) => pointInArea(lng, lat, a));
		return {
			country: country?.name ?? '',
			country_code: country?.iso ?? '',
			region: region?.name ?? ''
		};
	};
}

// --- Street addresses via Nominatim ----------------------------------------
// Only about half of OSM's Tim Hortons nodes carry addr:* tags, and every store
// shares the same name, so the rest would be indistinguishable ("Tim Hortons,
// Ontario" describes hundreds). We resolve the gap once here, at harvest time,
// so the app pays nothing at runtime.
//
// Nominatim's policy caps bulk use at 1 request/second, hence the delay. The
// answers are cached on disk so re-running the harvester is nearly free and an
// interrupted run resumes where it stopped.
/**
 * Drive-through lanes masquerade as both features and street names. As a
 * feature they are geometry attached to a store, not a store; as a street name
 * they are the nearest road to a store that genuinely exists.
 */
const LANE = /drive[\s-]?(through|thru)/i;

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const GEO_CACHE = resolve(SCRIPTS, '.geocache.json');
const RATE_MS = 1100;

type Fix = { road?: string; house?: string; city?: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function reverseGeocode(lat: number, lng: number): Promise<Fix> {
	const url = `${NOMINATIM}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
	const res = await fetch(url, {
		headers: {
			'User-Agent': 'TimmiesPassport/0.1 (location harvester; contact: dev@timmiespassport.app)',
			'Accept-Language': 'en'
		}
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const a = ((await res.json()) as { address?: Record<string, string> }).address ?? {};
	const road = a.road || a.pedestrian || a.footway || a.neighbourhood || '';
	return {
		// A store's address is not the name of the lane that runs past it.
		road: LANE.test(road) ? '' : road,
		house: a.house_number || '',
		city: a.city || a.town || a.village || a.suburb || a.municipality || a.county || ''
	};
}

async function fillMissingAddresses(locs: Loc[]) {
	let cache: Record<string, Fix> = {};
	try {
		cache = JSON.parse(await readFile(GEO_CACHE, 'utf-8'));
	} catch {
		/* first run */
	}

	/*
	 * A record needs the geocoder if either field is blank, not only the
	 * address. Stores that arrived from OSM with a street tag but no city tag
	 * used to skip this queue entirely, which left 525 of them reading like
	 * "9 Maidstone Avenue, Ontario" - a road and a province with a whole town
	 * missing between them.
	 */
	const todo = locs.filter((l) => (!l.address || !l.city) && !cache[l.id]);
	const apply = (l: Loc, fix: Fix) => {
		if (!l.address) l.address = [fix.house, fix.road].filter(Boolean).join(' ') || fix.road || '';
		if (!l.city) l.city = fix.city ?? '';
	};

	if (todo.length) {
		console.log(`→ reverse-geocoding ${todo.length} addresses (~${Math.ceil(todo.length * RATE_MS / 60000)} min) …`);
	}
	let done = 0;
	for (const l of todo) {
		try {
			cache[l.id] = await reverseGeocode(l.lat, l.lng);
		} catch (err) {
			cache[l.id] = {}; // remember the miss so we do not retry every run
			console.warn(`  ${l.id}: ${(err as Error).message}`);
		}
		if (++done % 50 === 0) {
			await writeFile(GEO_CACHE, JSON.stringify(cache), 'utf-8');
			console.log(`  ${done}/${todo.length}`);
		}
		await sleep(RATE_MS);
	}
	await writeFile(GEO_CACHE, JSON.stringify(cache), 'utf-8');

	for (const l of locs) if (cache[l.id]) apply(l, cache[l.id]);
	const named = locs.filter((l) => l.address).length;
	console.log(`✓ ${named}/${locs.length} locations now have a street address`);
}

/**
 * Raw Overpass response, kept on disk. The API is frequently overloaded and a
 * failed query should not block work that only needs to re-derive fields from
 * coordinates we already have.
 */
const OVERPASS_CACHE = resolve(SCRIPTS, '.overpass.json');
const AIRPORT_CACHE = resolve(SCRIPTS, '.airports.json');

/**
 * Airports, so a store inside one can say so.
 *
 * Only aerodromes carrying an IATA code: that is the difference between the
 * few thousand airports a person might fly through and the twenty thousand
 * airstrips they would not, and it keeps the download to something a monthly
 * job can justify.
 */
type AirportRing = { name: string; box: [number, number, number, number]; ring: Ring };

async function fetchAirportRings(): Promise<AirportRing[]> {
	try {
		return JSON.parse(await readFile(AIRPORT_CACHE, 'utf-8')) as AirportRing[];
	} catch {
		/* not cached yet */
	}

	const query = `[out:json][timeout:180];(way["aeroway"="aerodrome"]["iata"]["name"];relation["aeroway"="aerodrome"]["iata"]["name"];);out geom;`;
	/* Same form encoding the harvest uses; a raw body earns a 406. */
	const res = await fetch(ENDPOINTS[0], {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Accept: 'application/json',
			'User-Agent': 'TimmiesPassport/0.1 (location harvester; contact: dev@timmiespassport.app)'
		},
		body: 'data=' + encodeURIComponent(query)
	});
	if (!res.ok) throw new Error(`Overpass ${res.status}`);
	const data = (await res.json()) as { elements: OverpassElement[] };

	const rings: AirportRing[] = [];
	for (const el of data.elements) {
		const name = el.tags?.name;
		if (!name) continue;
		/* A way is one ring; a relation is its outer ways, each taken alone. */
		const parts =
			el.type === 'way'
				? [el.geometry]
				: (el.members ?? [])
						.filter((m) => m.role === 'outer' || m.role === '')
						.map((m) => m.geometry);
		for (const part of parts) {
			if (!part || part.length < 4) continue;
			const ring = part.map((pt) => [pt.lon, pt.lat] as [number, number]) as Ring;
			const xs = ring.map((r) => r[0]);
			const ys = ring.map((r) => r[1]);
			rings.push({
				name,
				box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
				ring
			});
		}
	}
	await writeFile(AIRPORT_CACHE, JSON.stringify(rings), 'utf-8');
	return rings;
}

async function applyAirports(locs: Loc[]): Promise<void> {
	let rings: AirportRing[];
	try {
		rings = await fetchAirportRings();
	} catch (err) {
		console.warn(`! airports skipped (${(err as Error).message})`);
		return;
	}

	let tagged = 0;
	for (const l of locs) {
		for (const a of rings) {
			if (l.lng < a.box[0] || l.lng > a.box[2] || l.lat < a.box[1] || l.lat > a.box[3]) continue;
			if (!pointInRing(l.lng, l.lat, a.ring)) continue;
			l.venue = a.name;
			tagged++;
			break;
		}
	}
	console.log(`✓ ${tagged} stores sit inside an airport`);
}

async function readOverpassCache(): Promise<OverpassElement[] | null> {
	try {
		return JSON.parse(await readFile(OVERPASS_CACHE, 'utf-8')) as OverpassElement[];
	} catch {
		return null;
	}
}

async function runOverpass(): Promise<OverpassElement[]> {
	let lastErr: unknown;
	const cached = await readOverpassCache();

	for (const url of ENDPOINTS) {
		try {
			console.log(`→ querying ${url} …`);
			const res = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Accept: 'application/json',
					'User-Agent': 'TimmiesPassport/0.1 (location harvester; contact: dev@timmiespassport.app)'
				},
				body: 'data=' + encodeURIComponent(QUERY)
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = (await res.json()) as { elements: OverpassElement[] };
			const elements = json.elements ?? [];

			/*
			 * Overpass sometimes answers 200 with a truncated result when it is
			 * under load, which would silently shrink the dataset. Treat a sudden
			 * drop as a bad response and keep what we already had. Set
			 * ALLOW_SHRINK=1 when the brand really has closed that many stores.
			 */
			if (cached && elements.length < cached.length * 0.97 && !process.env.ALLOW_SHRINK) {
				console.warn(
					`! ${url} returned ${elements.length} of an expected ~${cached.length} - ` +
						`looks truncated, keeping the cached set (ALLOW_SHRINK=1 to override)`
				);
				continue;
			}

			if (elements.length) await writeFile(OVERPASS_CACHE, JSON.stringify(elements), 'utf-8');
			return elements;
		} catch (err) {
			console.warn(`  failed: ${(err as Error).message}`);
			lastErr = err;
		}
	}

	if (cached) {
		console.warn(`! Overpass unusable - reusing ${cached.length} cached elements`);
		return cached;
	}
	throw lastErr;
}

function normalize(el: OverpassElement): Loc | null {
	const lat = el.lat ?? el.center?.lat;
	const lng = el.lon ?? el.center?.lon;
	if (lat == null || lng == null) return null;
	const t = el.tags ?? {};

	// A lane mapped as its own feature is not a storefront.
	if (LANE.test(t['name'] ?? '') || LANE.test(t['addr:street'] ?? '') || LANE.test(t['branch'] ?? ''))
		return null;

	/*
	 * OSM records a closure by prefixing the tags that described the business -
	 * `disused:amenity`, `was:brand`, `demolished:building` - rather than by
	 * deleting the object. An explicit `disused=yes` or `opening_hours=closed`
	 * says the same thing outright.
	 */
	const lifecycle = /^(disused|was|abandoned|demolished|razed|removed|closed):/;

	const closed =
		Object.keys(t).some((k) => lifecycle.test(k)) ||
		t['disused'] === 'yes' ||
		t['opening_hours'] === 'closed';

	// Every store is called "Tim Hortons", so the address is the only thing that
	// identifies one. Roughly half of OSM's nodes carry no addr:housenumber, so
	// fall through progressively coarser tags rather than giving up: a branch
	// name ("Yonge & Eglinton") still tells a human which store this is.
	const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
	const rawAddress =
		street ||
		t['addr:full'] ||
		t['addr:street'] ||
		t['addr:place'] ||
		t['branch'] ||
		t['addr:neighbourhood'] ||
		'';
	// Some mappers put the store's own name in the street tag; "Tim Horton's"
	// is not an address, and downstream it produced "Tim Hortons on Tim
	// Horton's". Dropped here so the geocoder backfills a real one.
	const address = /^tim\s*horton'?s?$/i.test(rawAddress.trim()) ? '' : rawAddress;

	return {
		id: `${el.type[0]}${el.id}`,
		osm_id: `${el.type}/${el.id}`,
		name: t['name'] || 'Tim Hortons',
		lat: +lat.toFixed(6),
		lng: +lng.toFixed(6),
		address,
		city:
			t['addr:city'] ||
			t['addr:town'] ||
			t['addr:village'] ||
			t['addr:suburb'] ||
			t['addr:hamlet'] ||
			t['addr:municipality'] ||
			t['addr:district'] ||
			'',
		region: t['addr:state'] || t['addr:province'] || '',
		country: t['addr:country'] || '',
		country_code: (t['addr:country'] || '').toUpperCase(),
		closed
	};
}

/** Rough metres between two points - fine at the scale of one storefront. */
function metresBetween(a: Loc, b: Loc): number {
	const R = 6371000;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = (((b.lng - a.lng) * Math.PI) / 180) * Math.cos(((a.lat + b.lat) / 2 * Math.PI) / 180);
	return R * Math.hypot(dLat, dLng);
}

/**
 * Collapse the same storefront mapped more than once.
 *
 * OSM frequently carries both a node for the business and a way for the
 * building it sits in, both tagged with the brand, which renders as two cups
 * stacked on the same spot. A node inside its own building can sit tens of
 * metres from the building's centroid, so proximity alone is the test for a
 * mixed-type pair.
 *
 * Two features of the same type need their addresses to agree as well, because
 * distance alone cannot tell 600 University Avenue from 610 University Avenue
 * across the street.
 */
function sameAddress(a: Loc, b: Loc): boolean {
	const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
	const x = norm(a.address);
	const y = norm(b.address);
	return !x || !y || x === y;
}

function dedupe(locs: Loc[]): { kept: Loc[]; dropped: Set<string> } {
	const MIXED_M = 60;
	const SAME_TYPE_M = 60;
	const byLat = [...locs].sort((a, b) => a.lat - b.lat);
	const dropped = new Set<string>();

	for (let i = 0; i < byLat.length; i++) {
		if (dropped.has(byLat[i].id)) continue;
		for (let j = i + 1; j < byLat.length && byLat[j].lat - byLat[i].lat < 0.0007; j++) {
			if (dropped.has(byLat[j].id)) continue;
			const a = byLat[i];
			const b = byLat[j];
			const sameType = a.osm_id.split('/')[0] === b.osm_id.split('/')[0];
			if (metresBetween(a, b) > (sameType ? SAME_TYPE_M : MIXED_M)) continue;
			if (sameType && !sameAddress(a, b)) continue;

			/*
			 * The survivor is chosen by id, not by richness.
			 *
			 * Richness depends on enrichment, which grows between harvests as the
			 * geocode cache fills, so it flipped which half of a pair survived.
			 * The merge then read the previous winner as a store that had
			 * vanished and tombstoned it - the closed count climbed on every run
			 * and the duplicate cup came back greyed out. A stable key keeps the
			 * same id forever, which is also what stamps are keyed on.
			 */
			const [keep, drop] = a.id < b.id ? [a, b] : [b, a];
			if (!keep.address) keep.address = drop.address;
			if (!keep.city) keep.city = drop.city;
			if (!keep.region) keep.region = drop.region;
			if (!keep.country) keep.country = drop.country;
			if (!keep.country_code) keep.country_code = drop.country_code;
			dropped.add(drop.id);
		}
	}

	return { kept: locs.filter((l) => !dropped.has(l.id)), dropped };
}

function escapeSql(v: string): string {
	return v.replace(/'/g, "''");
}

const CHUNK = 400; // rows per INSERT statement

export function buildSeedSql(locs: Loc[]): string {
	const lines: string[] = [
		`-- Generated by update-restaurants.ts on ${new Date().toISOString()}`,
		`-- ${locs.length} Tim Hortons locations from OpenStreetMap (ODbL)`,
		`DELETE FROM locations;`
	];
	for (let i = 0; i < locs.length; i += CHUNK) {
		const rows = locs
			.slice(i, i + CHUNK)
			.map(
				(l) =>
					`('${l.id}','${escapeSql(l.osm_id)}','${escapeSql(l.name)}',${l.lat},${l.lng},` +
					`'${escapeSql(l.address)}','${escapeSql(l.city)}','${escapeSql(l.region)}',` +
					`'${escapeSql(l.country)}','${escapeSql(l.country_code)}',${l.closed ? 1 : 0})`
			)
			.join(',\n');
		lines.push(
			`INSERT INTO locations (id, osm_id, name, lat, lng, address, city, region, country, country_code, closed) VALUES\n${rows};`
		);
	}
	/*
	 * The DELETE above wiped check_in_count back to its default, and this
	 * seed runs monthly from CI - without this line, every harvest would
	 * silently zero "N people have stamped here" across the whole map. The
	 * visits table is the source of truth, so the tallies come back from it.
	 */
	lines.push(
		`UPDATE locations SET check_in_count = (SELECT COUNT(*) FROM visits WHERE visits.location_id = locations.id);`
	);
	return lines.join('\n') + '\n';
}

/**
 * A gazetteer of world places, so search can navigate to somewhere that has no
 * Tim Hortons in it.
 *
 * Search can only find places that hold a store, which means a city like
 * Pittsburgh - whose nearest Timmies are in the suburbs - looks like a dead
 * end. Natural Earth's populated places cover ~7,000 towns and cities with
 * coordinates, free and offline.
 *
 * Names are interned because the country repeats thousands of times; the file
 * is a third of the size written out flat.
 */
const NE_PLACES =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson';

async function buildGazetteer() {
	console.log('→ building the place gazetteer …');
	const res = await fetch(NE_PLACES, {
		headers: { 'User-Agent': 'TimmiesPassport/0.1 gazetteer' }
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const fc = (await res.json()) as { features: any[] };

	const regions: string[] = [];
	const countries: string[] = [];
	const intern = (pool: string[], v: string) => {
		if (!v) return -1;
		let i = pool.indexOf(v);
		if (i < 0) i = pool.push(v) - 1;
		return i;
	};

	const cities = fc.features
		.map((f) => {
			const p = f.properties ?? {};
			const [lng, lat] = f.geometry?.coordinates ?? [];
			if (typeof lng !== 'number' || typeof lat !== 'number') return null;
			const name = p.name || p.nameascii;
			if (!name) return null;
			return [
				name,
				intern(regions, p.adm1name ?? ''),
				intern(countries, p.adm0name ?? ''),
				+lat.toFixed(3),
				+lng.toFixed(3),
				p.pop_max ?? 0
			];
		})
		.filter(Boolean)
		// Biggest first, so a bare "london" offers the largest one.
		.sort((a: any, b: any) => b[5] - a[5]);

	await writeFile(
		resolve(ROOT, 'static/cities.json'),
		JSON.stringify({ regions, countries, cities }),
		'utf-8'
	);
	console.log(`✓ wrote static/cities.json (${cities.length} places)`);
}

/**
 * Fold the freshly harvested set into whatever shipped last time.
 *
 * The rule that matters: nothing is ever removed. A stamp is stored against a
 * location id in the visitor's own browser, so deleting a row would silently
 * empty part of somebody's passport. A store that has vanished from OSM, or
 * been retagged as disused, is kept and marked closed instead - it still
 * renders, greyed out, and anyone who collected it keeps it.
 *
 * That makes the harvest safe to run on a schedule: it only ever adds stores,
 * refreshes details, and flips the closed flag.
 */
async function mergeWithShipped(fresh: Loc[], dropped: Set<string>): Promise<Loc[]> {
	let shipped: Loc[] = [];
	try {
		const raw = JSON.parse(await readFile(resolve(ROOT, 'static/locations.json'), 'utf-8'));
		shipped = (raw.features ?? []).map((f: any) => ({
			...f.properties,
			lat: f.geometry.coordinates[1],
			lng: f.geometry.coordinates[0],
			osm_id: f.properties.osm_id ?? '',
			closed: !!f.properties.closed
		}));
	} catch {
		return fresh; // first run
	}

	const byId = new Map(fresh.map((l) => [l.id, l]));
	let reopened = 0;
	let tombstoned = 0;

	for (const old of shipped) {
		/*
		 * Ids this harvest deliberately merged away are not missing stores, they
		 * are the losing half of a duplicate pair. Resurrecting them as
		 * tombstones would put the second cup back on the map and grow the
		 * closed count on every single run.
		 */
		if (dropped.has(old.id)) continue;

		/*
		 * Stores that came from the brand locator have no OSM object behind
		 * them, so their absence from an OSM harvest means nothing. Carry them
		 * through untouched and let the locator decide their fate below.
		 *
		 * Recognised by the shape of the id (th…), not by the osm_id field:
		 * the shipped GeoJSON never carries osm_id, so testing it here made
		 * every record look brand-sourced - which quietly turned this merge
		 * into "shipped always wins". Freshly geocoded cities were computed
		 * and then thrown away, and a store vanishing from OSM could never be
		 * tombstoned again, because its stale shipped copy always took the
		 * slot before either check was reached.
		 */
		if (!/^[nwr]\d+$/.test(old.id)) {
			byId.set(old.id, old);
			continue;
		}

		const now = byId.get(old.id);
		if (!now) {
			// Gone from OSM entirely: keep it, mark it closed.
			if (!old.closed) tombstoned++;
			byId.set(old.id, { ...old, closed: true });
			continue;
		}
		// Keep detail we already had if this harvest came back thinner.
		now.address ||= old.address;
		now.city ||= old.city;
		if (old.closed && !now.closed) reopened++;
	}

	const merged = [...byId.values()];
	const closed = merged.filter((l) => l.closed).length;
	console.log(
		`✓ merged with the shipped set: ${merged.length - shipped.length} added, ` +
			`${tombstoned} newly closed, ${reopened} reopened, ${closed} closed in total`
	);
	return merged;
}

/**
 * Hand corrections, applied after everything else so they always win.
 *
 * OpenStreetMap lags reality: a store that has moved or quietly shut often
 * carries no closure tag for months. This is the lever for those, and for
 * undoing a heuristic that guessed wrong.
 */
async function applyOverrides(locs: Loc[]) {
	let raw: { closed?: Record<string, string>; open?: Record<string, string> };
	try {
		raw = JSON.parse(await readFile(resolve(SCRIPTS, 'overrides.json'), 'utf-8'));
	} catch {
		return;
	}

	const byId = new Map(locs.map((l) => [l.id, l]));
	let closed = 0;
	let opened = 0;
	let stale: string[] = [];

	for (const id of Object.keys(raw.closed ?? {})) {
		const l = byId.get(id);
		if (!l) stale.push(id);
		else if (!l.closed) {
			l.closed = true;
			closed++;
		}
	}
	for (const id of Object.keys(raw.open ?? {})) {
		const l = byId.get(id);
		if (!l) stale.push(id);
		else if (l.closed) {
			l.closed = false;
			opened++;
		}
	}

	console.log(`✓ overrides: ${closed} forced closed, ${opened} forced open`);
	if (stale.length) {
		console.warn(`! overrides reference ${stale.length} unknown id(s): ${stale.join(", ")}`);
	}
}

// --- The brand's own store list -------------------------------------------
/*
 * OpenStreetMap says where stores are; Tim Hortons says which ones exist.
 *
 * All The Places scrapes the chain's own locator API and publishes it under
 * CC0, refreshed weekly. That makes it the authoritative answer to "is this
 * one still open", and it is free and storable - unlike Google Places, whose
 * terms forbid persisting their content in a file like ours.
 *
 * It only covers the markets the locator serves, so its silence is only
 * evidence in those countries. A store in Jiangsu is not closed merely because
 * the North American locator has never heard of it.
 */
const ATP_LATEST = 'https://data.alltheplaces.xyz/runs/latest.json';
const ATP_SPIDERS = ['tim_hortons', 'tim_hortons_gb'];
const BRAND_COUNTRIES = new Set(['CA', 'US', 'GB']);
/** OSM and the locator rarely agree to the metre; this is a storefront's worth. */
const MATCH_M = 400;

type BrandStore = { ref: string; lat: number; lng: number; address: string; city: string; country: string };

async function fetchBrandStores(): Promise<BrandStore[]> {
	const latest = (await (await fetch(ATP_LATEST)).json()) as { run_id: string };
	const base = `https://alltheplaces-data.openaddresses.io/runs/${latest.run_id}/output`;
	const out: BrandStore[] = [];

	for (const spider of ATP_SPIDERS) {
		const res = await fetch(`${base}/${spider}.geojson`);
		if (!res.ok) throw new Error(`${spider}: HTTP ${res.status}`);
		const fc = (await res.json()) as { features: any[] };
		for (const f of fc.features) {
			const [lng, lat] = f.geometry?.coordinates ?? [];
			if (typeof lat !== 'number' || typeof lng !== 'number') continue;
			const p = f.properties ?? {};
			out.push({
				ref: String(p.ref ?? ''),
				lat,
				lng,
				address: p['addr:street_address'] ?? '',
				city: p['addr:city'] ?? '',
				country: (p['addr:country'] ?? '').toUpperCase()
			});
		}
	}
	console.log(`  ${out.length} stores in the brand locator (run ${latest.run_id})`);
	return out;
}

/**
 * Reconcile our map against that list: close what the brand no longer lists,
 * reopen what it does, and add stores we never had.
 *
 * Matching is greedy nearest-first so two stores in one plaza cannot both claim
 * the same locator entry.
 */
function reconcileWithBrand(locs: Loc[], brand: BrandStore[]): Loc[] {
	const covered = locs.filter((l) => BRAND_COUNTRIES.has(l.country_code));
	const pairs: { d: number; loc: Loc; store: BrandStore }[] = [];

	// Bucket by latitude so this stays a few million comparisons, not twenty.
	const buckets = new Map<number, BrandStore[]>();
	const key = (lat: number) => Math.round(lat * 100);
	for (const s of brand) {
		const k = key(s.lat);
		(buckets.get(k) ?? buckets.set(k, []).get(k)!).push(s);
	}

	for (const loc of covered) {
		const k = key(loc.lat);
		for (const dk of [k - 1, k, k + 1]) {
			for (const store of buckets.get(dk) ?? []) {
				const d = metresBetween(loc, { lat: store.lat, lng: store.lng } as Loc);
				if (d <= MATCH_M) pairs.push({ d, loc, store });
			}
		}
	}

	pairs.sort((a, b) => a.d - b.d);
	const takenLoc = new Set<string>();
	const takenStore = new Set<BrandStore>();
	for (const { loc, store } of pairs) {
		if (takenLoc.has(loc.id) || takenStore.has(store)) continue;
		takenLoc.add(loc.id);
		takenStore.add(store);
	}

	let closed = 0;
	let reopened = 0;
	for (const loc of covered) {
		const listed = takenLoc.has(loc.id);
		if (!listed && !loc.closed) {
			loc.closed = true;
			closed++;
		} else if (listed && loc.closed) {
			loc.closed = false;
			reopened++;
		}
	}

	// Stores the brand lists that we have never had a record of.
	const added: Loc[] = [];
	for (const store of brand) {
		if (takenStore.has(store) || !store.ref) continue;
		added.push({
			id: `th${store.ref}`,
			osm_id: '',
			name: 'Tim Hortons',
			lat: +store.lat.toFixed(6),
			lng: +store.lng.toFixed(6),
			address: store.address,
			city: store.city,
			region: '',
			country: '',
			country_code: store.country,
			closed: false
		});
	}
	locs.push(...added);

	console.log(
		`✓ brand locator: ${closed} closed, ${reopened} reopened, ${added.length} new stores added`
	);
	return added;
}

async function main() {
	const elements = await runOverpass();
	console.log(`← received ${elements.length} raw elements`);

	const byId = new Map<string, Loc>();
	for (const el of elements) {
		const loc = normalize(el);
		if (loc) byId.set(loc.id, loc);
	}
	const locs = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
	console.log(`✓ normalized to ${locs.length} unique locations`);

	/*
	 * Derive country and region from coordinates, preferring that over the OSM
	 * tags. OSM records provinces however each mapper felt like it - "Ontario",
	 * "ON", "Ont", "ON." and "On" all appear - whereas the boundary data gives
	 * one canonical name, which is what lists and grouping need.
	 */
	let geocode: Awaited<ReturnType<typeof buildGeocoder>> | null = null;
	const placeAll = (rows: Loc[]) => {
		if (!geocode) return 0;
		let filled = 0;
		for (const l of rows) {
			const g = geocode(l.lng, l.lat);
			if (g.country) l.country = g.country;
			if (g.country_code) l.country_code = g.country_code;
			if (g.region) l.region = g.region;
			if (l.country_code) filled++;
		}
		return filled;
	};

	try {
		geocode = await buildGeocoder();
		console.log(`✓ reverse-geocoded ${placeAll(locs)} locations to a country`);
	} catch (err) {
		console.warn(`! reverse-geocoding skipped (${(err as Error).message}) - using OSM tags only`);
	}

	await fillMissingAddresses(locs);

	/*
	 * Dedupe last, not first: telling 600 University Avenue from 610 across the
	 * street needs both addresses, and those are only known once the enrichment
	 * above has run.
	 */
	const { kept, dropped } = dedupe(locs);
	console.log(`✓ merged ${dropped.size} duplicate storefronts`);

	const withHistory = await mergeWithShipped(kept, dropped);
	locs.length = 0;
	locs.push(...withHistory.sort((a, b) => a.id.localeCompare(b.id)));

	try {
		console.log('→ checking against the brand locator …');
		const added = reconcileWithBrand(locs, await fetchBrandStores());
		// Stores the locator contributed arrive with coordinates but no region,
		// so they go through the same placement as the rest.
		if (added.length) placeAll(added);
	} catch (err) {
		console.warn(`! brand check skipped (${(err as Error).message}) - closures left as OSM has them`);
	}

	// Last, so a hand correction survives deduping and the brand check.
	await applyOverrides(locs);
	await applyAirports(locs);

	// GeoJSON for the map
	const geojson = {
		type: 'FeatureCollection' as const,
		generated: new Date().toISOString(),
		features: locs.map((l) => ({
			type: 'Feature' as const,
			id: l.id,
			geometry: { type: 'Point' as const, coordinates: [l.lng, l.lat] },
			properties: {
				id: l.id,
				name: l.name,
				address: l.address,
				city: l.city,
				region: l.region,
				country: l.country,
				country_code: l.country_code,
				// Both omitted when empty, which keeps the payload small.
				...(l.venue ? { venue: l.venue } : {}),
				...(l.closed ? { closed: true } : {})
			}
		}))
	};

	await mkdir(resolve(ROOT, 'static'), { recursive: true });
	await writeFile(
		resolve(ROOT, 'static/locations.json'),
		JSON.stringify(geojson),
		'utf-8'
	);
	console.log('✓ wrote static/locations.json');

	try {
		await buildGazetteer();
	} catch (err) {
		console.warn(`! gazetteer skipped (${(err as Error).message})`);
	}

	// D1 seed - chunked INSERTs (a single 4k-row statement hits SQLITE_TOOBIG)
	await writeFile(resolve(ROOT, 'scripts/seed.sql'), buildSeedSql(locs), 'utf-8');
	console.log('✓ wrote scripts/seed.sql');
}

// Only run the harvester when executed directly (not when imported for buildSeedSql).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	main().catch((err) => {
		console.error('Harvest failed:', err);
		process.exit(1);
	});
}

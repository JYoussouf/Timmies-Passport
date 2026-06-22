/**
 * Timmies Passport — location harvester
 * ---------------------------------------------------------------
 * Pulls every Tim Hortons in the world from OpenStreetMap via the
 * Overpass API, normalizes it, and writes:
 *   - data/locations.json   (GeoJSON FeatureCollection, served to the map)
 *   - scripts/seed.sql       (D1 seed for the `locations` table)
 *
 * OSM data is ODbL-licensed (free + redistributable). Re-run any time to
 * refresh. Counts/leaderboards come from `visits`, never from Overpass.
 *
 *   npm run fetch:locations
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

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
};

// --- Offline reverse-geocoding via Natural Earth boundaries ----------------
// OSM almost never tags addr:country, so we derive country + region from the
// point's coordinates using point-in-polygon. Fetched once at harvest time.
const NE_COUNTRIES =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const NE_REGIONS =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson';

type Ring = number[][];
type Poly = Ring[];
type Area = { name: string; iso: string; bbox: [number, number, number, number]; polys: Poly[] };

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
	pick: (p: any) => { name: string; iso: string }
): Promise<Area[]> {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'TimmiesPassport/0.1 boundaries' }
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const fc = (await res.json()) as { features: any[] };
	return fc.features.map((f) => {
		const polys = geomToPolys(f.geometry);
		const { name, iso } = pick(f.properties);
		return { name, iso, polys, bbox: bboxOf(polys) };
	});
}

async function buildGeocoder() {
	console.log('→ loading Natural Earth boundaries for reverse-geocoding …');
	const [countries, regions] = await Promise.all([
		loadAreas(NE_COUNTRIES, (p) => ({
			name: p.ADMIN || p.NAME || '',
			iso: (p.ISO_A2 !== '-99' ? p.ISO_A2 : p.ISO_A2_EH) || ''
		})),
		loadAreas(NE_REGIONS, (p) => ({ name: p.name || '', iso: p.iso_3166_2 || '' })).catch(
			() => [] as Area[]
		)
	]);
	console.log(`  ${countries.length} countries, ${regions.length} regions loaded`);
	return (lng: number, lat: number) => {
		let country = countries.find((a) => pointInArea(lng, lat, a));
		let region = regions.find((a) => pointInArea(lng, lat, a));
		return {
			country: country?.name ?? '',
			country_code: country?.iso ?? '',
			region: region?.name ?? ''
		};
	};
}

async function runOverpass(): Promise<OverpassElement[]> {
	let lastErr: unknown;
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
			return json.elements ?? [];
		} catch (err) {
			console.warn(`  failed: ${(err as Error).message}`);
			lastErr = err;
		}
	}
	throw lastErr;
}

function normalize(el: OverpassElement): Loc | null {
	const lat = el.lat ?? el.center?.lat;
	const lng = el.lon ?? el.center?.lon;
	if (lat == null || lng == null) return null;
	const t = el.tags ?? {};

	const houseAndStreet = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
	const address = houseAndStreet || t['addr:full'] || '';

	return {
		id: `${el.type[0]}${el.id}`,
		osm_id: `${el.type}/${el.id}`,
		name: t['name'] || 'Tim Hortons',
		lat: +lat.toFixed(6),
		lng: +lng.toFixed(6),
		address,
		city: t['addr:city'] || t['addr:town'] || t['addr:village'] || '',
		region: t['addr:state'] || t['addr:province'] || '',
		country: t['addr:country'] || '',
		country_code: (t['addr:country'] || '').toUpperCase()
	};
}

function escapeSql(v: string): string {
	return v.replace(/'/g, "''");
}

const CHUNK = 400; // rows per INSERT statement

export function buildSeedSql(locs: Loc[]): string {
	const lines: string[] = [
		`-- Generated by scripts/fetch-locations.ts on ${new Date().toISOString()}`,
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
					`'${escapeSql(l.country)}','${escapeSql(l.country_code)}')`
			)
			.join(',\n');
		lines.push(
			`INSERT INTO locations (id, osm_id, name, lat, lng, address, city, region, country, country_code) VALUES\n${rows};`
		);
	}
	return lines.join('\n') + '\n';
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

	// Enrich missing country/region from coordinates (OSM tags win when present).
	try {
		const geocode = await buildGeocoder();
		let filled = 0;
		for (const l of locs) {
			if (l.country_code && l.region) continue;
			const g = geocode(l.lng, l.lat);
			if (!l.country) l.country = g.country;
			if (!l.country_code) l.country_code = g.country_code;
			if (!l.region) l.region = g.region;
			if (l.country_code) filled++;
		}
		console.log(`✓ reverse-geocoded ${filled} locations to a country`);
	} catch (err) {
		console.warn(`! reverse-geocoding skipped (${(err as Error).message}) — using OSM tags only`);
	}

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
				country_code: l.country_code
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

	// D1 seed — chunked INSERTs (a single 4k-row statement hits SQLITE_TOOBIG)
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

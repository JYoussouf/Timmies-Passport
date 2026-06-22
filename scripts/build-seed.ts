/**
 * Regenerates scripts/seed.sql from the existing static/locations.json
 * without re-querying Overpass. Useful after tweaking the SQL format.
 *   node --experimental-strip-types scripts/build-seed.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeedSql } from './fetch-locations.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const geo = JSON.parse(await readFile(resolve(ROOT, 'static/locations.json'), 'utf-8'));
const locs = geo.features.map((f: any) => ({
	id: f.properties.id,
	osm_id: f.properties.osm_id ?? '',
	name: f.properties.name,
	lat: f.geometry.coordinates[1],
	lng: f.geometry.coordinates[0],
	address: f.properties.address ?? '',
	city: f.properties.city ?? '',
	region: f.properties.region ?? '',
	country: f.properties.country ?? '',
	country_code: f.properties.country_code ?? ''
}));

await writeFile(resolve(ROOT, 'scripts/seed.sql'), buildSeedSql(locs), 'utf-8');
console.log(`✓ regenerated scripts/seed.sql (${locs.length} rows)`);

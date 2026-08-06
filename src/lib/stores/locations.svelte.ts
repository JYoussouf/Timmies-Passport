import type { LocationCollection, LocationProps, Place } from '$lib/types';

/**
 * Loads the worldwide Tim Hortons dataset once and indexes it by id.
 * 4k+ points fit comfortably in memory; the map clusters them client-side.
 */
class LocationStore {
	collection = $state<LocationCollection | null>(null);
	index = new Map<string, LocationProps>();
	coords = new Map<string, [number, number]>();
	loading = $state(false);
	error = $state<string | null>(null);

	get total() {
		return this.collection?.features.length ?? 0;
	}

	async load() {
		if (this.collection || this.loading) return;
		this.loading = true;
		try {
			const res = await fetch('/locations.json');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as LocationCollection;
			for (const f of data.features) {
				this.index.set(f.properties.id, f.properties);
				this.coords.set(f.properties.id, f.geometry.coordinates);
			}
			this.collection = data;
		} catch (err) {
			this.error = (err as Error).message;
		} finally {
			this.loading = false;
		}
	}

	/**
	 * `index` and `coords` are plain Maps, so reading them inside a component
	 * or a `$derived` creates no reactive dependency. Every accessor touches
	 * the reactive `collection` first so lookups made before the fetch lands
	 * re-run once it does - without that, anything rendered during loading
	 * keeps its fallback value forever.
	 */
	get(id: string): LocationProps | undefined {
		void this.collection;
		return this.index.get(id);
	}

	coordsOf(id: string): [number, number] | undefined {
		void this.collection;
		return this.coords.get(id);
	}

	/** All indexed locations, as a reactive read. */
	all(): IterableIterator<LocationProps> {
		void this.collection;
		return this.index.values();
	}


	/**
	 * Searchable places, derived from the locations themselves so the two can
	 * never drift apart.
	 *
	 * Indexed at two levels, because which one carries the name people know
	 * varies by country: Toronto is a city, but Beijing is a region whose
	 * cities are districts like Chaoyang, and Dubai's city field is in Arabic.
	 * Indexing only cities made search look Canada-only.
	 *
	 * A region always contains its cities, so where both share a name the
	 * region wins - it has the fuller count and the wider bounds.
	 */
	private placeCache: Place[] | null = null;

	get places(): Place[] {
		void this.collection;
		if (this.placeCache?.length) return this.placeCache;

		const byKey = new Map<string, Place>();
		const add = (key: string, name: string, context: string, c: [number, number]) => {
			let place = byKey.get(key);
			if (!place) {
				place = { key, name, context, count: 0, bounds: [c[0], c[1], c[0], c[1]] };
				byKey.set(key, place);
			}
			place.count++;
			const b = place.bounds;
			if (c[0] < b[0]) b[0] = c[0];
			if (c[1] < b[1]) b[1] = c[1];
			if (c[0] > b[2]) b[2] = c[0];
			if (c[1] > b[3]) b[3] = c[1];
		};

		for (const [id, p] of this.index) {
			const c = this.coords.get(id);
			if (!c) continue;
			const country = p.country || '';
			if (p.city) {
				// A city inside a like-named region reads "Leicester, Leicester, UK".
				const where = [p.region, country].filter((v) => v && v !== p.city).join(', ');
				add(`c|${p.city}|${p.region}|${country}`, p.city, where, c);
			}
			if (p.region) add(`r|${p.region}|${country}`, p.region, country, c);
		}

		// Collapse a city and its like-named region into the broader one.
		const best = new Map<string, Place>();
		for (const place of byKey.values()) {
			const dedupe = `${place.name.toLowerCase()}|${place.context.split(', ').pop() ?? ''}`;
			const seen = best.get(dedupe);
			if (!seen || place.count > seen.count) best.set(dedupe, place);
		}

		this.placeCache = [...best.values()].sort((a, b) => b.count - a.count);
		return this.placeCache;
	}

	/**
	 * A spatially even sample of locations within `span` degrees of a point.
	 *
	 * Taking the N nearest would be useless for the radar: in a dense metro the
	 * closest sixty stores all land on the same pixel. Instead the window is
	 * divided into a `grid` x `grid` lattice and one store is kept per cell, so
	 * the blips actually describe the surrounding area.
	 *
	 * A linear scan over ~4k points is well under a millisecond, so there is no
	 * reason to carry a spatial index for this.
	 */
	sampleAround(lng: number, lat: number, span: number, grid = 14) {
		void this.collection;
		const seen = new Map<number, { id: string; lng: number; lat: number }>();
		for (const [id, [x, y]] of this.coords) {
			const dx = x - lng;
			const dy = y - lat;
			if (Math.abs(dx) > span || Math.abs(dy) > span) continue;
			const cx = Math.round(((dx / span) * grid) / 2);
			const cy = Math.round(((dy / span) * grid) / 2);
			const key = cx * 1000 + cy;
			if (!seen.has(key)) seen.set(key, { id, lng: x, lat: y });
		}
		return [...seen.values()];
	}

}

export const locations = new LocationStore();

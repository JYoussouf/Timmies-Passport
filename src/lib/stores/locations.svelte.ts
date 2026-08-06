import type { LocationCollection, LocationFeature, LocationProps } from '$lib/types';

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

	feature(id: string): LocationFeature | undefined {
		void this.collection;
		const props = this.index.get(id);
		const coordinates = this.coords.get(id);
		if (!props || !coordinates) return undefined;
		return { type: 'Feature', id, geometry: { type: 'Point', coordinates }, properties: props };
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

	/** Total distinct Tim Hortons in a given country code. */
	countInCountry(cc: string): number {
		let n = 0;
		for (const p of this.all()) if (p.country_code === cc) n++;
		return n;
	}
}

export const locations = new LocationStore();

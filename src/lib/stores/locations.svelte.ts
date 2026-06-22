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

	get(id: string): LocationProps | undefined {
		return this.index.get(id);
	}

	feature(id: string): LocationFeature | undefined {
		const props = this.index.get(id);
		const coordinates = this.coords.get(id);
		if (!props || !coordinates) return undefined;
		return { type: 'Feature', id, geometry: { type: 'Point', coordinates }, properties: props };
	}

	/** Total distinct Tim Hortons in a given country code. */
	countInCountry(cc: string): number {
		let n = 0;
		for (const p of this.index.values()) if (p.country_code === cc) n++;
		return n;
	}
}

export const locations = new LocationStore();

/**
 * A gazetteer of world places, loaded only when someone searches.
 *
 * Search can otherwise only find places that hold a Tim Hortons, so a city
 * like Pittsburgh - whose nearest stores are in the suburbs - looks like a
 * dead end rather than a place you can go and look around.
 *
 * Generated at harvest time from Natural Earth, and interned: the country name
 * repeats thousands of times, so the file is a third of the size written flat.
 */
export interface GazetteerPlace {
	name: string;
	context: string;
	lng: number;
	lat: number;
}

type Raw = {
	regions: string[];
	countries: string[];
	/** [name, regionIndex, countryIndex, lat, lng, population] */
	cities: [string, number, number, number, number, number][];
};

class Gazetteer {
	private places: GazetteerPlace[] = [];
	private loading: Promise<void> | null = null;
	/** Bumped once loaded, so `$derived` searches re-run. */
	version = $state(0);

	/** Idempotent; safe to call on every focus. */
	load(): Promise<void> {
		if (this.loading) return this.loading;
		this.loading = (async () => {
			try {
				const res = await fetch('/cities.json');
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const raw = (await res.json()) as Raw;
				this.places = raw.cities.map(([name, r, c, lat, lng]) => ({
					name,
					context: [raw.regions[r], raw.countries[c]]
						.filter((v) => v && v !== name)
						.join(', '),
					lat,
					lng
				}));
				this.version++;
			} catch {
				// A missing gazetteer only costs the fallback, never the search.
			}
		})();
		return this.loading;
	}

	/** Already ordered by population, so the first hits are the biggest places. */
	search(term: string, limit = 3): GazetteerPlace[] {
		void this.version;
		if (term.length < 2) return [];
		const out: GazetteerPlace[] = [];
		for (const p of this.places) {
			if (`${p.name} ${p.context}`.toLowerCase().includes(term)) {
				out.push(p);
				if (out.length >= limit) break;
			}
		}
		return out;
	}
}

export const gazetteer = new Gazetteer();

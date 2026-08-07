export interface LocationProps {
	id: string;
	name: string;
	address: string;
	city: string;
	region: string;
	country: string;
	country_code: string;
	/** Tombstoned: gone from OSM or retagged as disused. Never deleted. */
	closed?: boolean;
	/**
	 * The airport this store stands inside, when it stands inside one. A
	 * terminal store's address says "Terminal 1 Departures" in whichever
	 * municipality the runway sits in, so this is the only thing that connects
	 * it to the airport people would search for.
	 */
	venue?: string;
}

/** A searchable place - a city or a region - aggregated from its locations. */
export interface Place {
	key: string;
	/** What the user would type: "Toronto", "Beijing", "Leicester". */
	name: string;
	/** Where it is, for disambiguating the many Londons and Windsors. */
	context: string;
	count: number;
	/** [minLng, minLat, maxLng, maxLat] over every Timmies in the place. */
	bounds: [number, number, number, number];
}

export interface LocationFeature {
	type: 'Feature';
	id: string;
	geometry: { type: 'Point'; coordinates: [number, number] };
	properties: LocationProps;
}

export interface LocationCollection {
	type: 'FeatureCollection';
	generated?: string;
	features: LocationFeature[];
}

/** A single check-in the user owns. */
export interface Visit {
	visitedAt: string; // ISO timestamp of the check-in
	note: string;
}

export type Visits = Record<string, Visit>;

export interface SessionUser {
	id: string;
	email: string;
	displayName: string;
}

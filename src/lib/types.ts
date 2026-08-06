export interface LocationProps {
	id: string;
	name: string;
	address: string;
	city: string;
	region: string;
	country: string;
	country_code: string;
}

/** A city or town, aggregated from the locations that sit in it. */
export interface Place {
	key: string;
	city: string;
	region: string;
	country: string;
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

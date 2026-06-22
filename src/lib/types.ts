export interface LocationProps {
	id: string;
	name: string;
	address: string;
	city: string;
	region: string;
	country: string;
	country_code: string;
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

export interface Badge {
	id: string;
	label: string;
	description: string;
	emoji: string;
	earned: boolean;
	/** 0..1 toward earning, for not-yet-earned badges. */
	progress: number;
}

export interface SessionUser {
	id: string;
	email: string;
	displayName: string;
}

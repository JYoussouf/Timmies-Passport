import type { StyleSpecification } from 'maplibre-gl';

/**
 * Free, no-API-key vector basemap (CARTO Positron, OpenMapTiles schema,
 * © OpenStreetMap contributors). Clean and light so our warm brand pins pop.
 * Swap to a self-hosted Protomaps style on R2 later for full ownership.
 */
export const BASEMAP_STYLE =
	'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const INITIAL_VIEW = {
	center: [-92, 49] as [number, number], // Tim's heartland: Canada + northern US
	zoom: 3.2
};

/** Brand-tinted overrides applied to the basemap once it loads. */
export function warmTheme(): { background: string } {
	return { background: '#f3ece0' };
}

export const _styleType: StyleSpecification | undefined = undefined;

import type { StyleSpecification } from 'maplibre-gl';

/**
 * Hand-rolled tracker basemap.
 *
 * The tiles are CARTO's free vector service (OpenMapTiles schema, © OpenStreetMap
 * contributors) but every layer is defined here so the map reads as a flat
 * arcade tracker screen rather than a general-purpose web map: cream landmass,
 * deep navy ocean, dotted borders, and almost nothing else until you zoom in.
 */

const TILES = 'https://tiles.basemaps.cartocdn.com/vector/carto.streets/v1/tiles.json';
const GLYPHS = 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf';

/** Palette mirror of the CSS tokens - MapLibre cannot read CSS variables. */
export const MAP_COLORS = {
	land: '#e8dcc8',
	landShade: '#dccdb4',
	ocean: '#101d2e',
	border: 'rgba(43, 26, 20, 0.38)',
	borderState: 'rgba(43, 26, 20, 0.16)',
	road: 'rgba(43, 26, 20, 0.3)',
	poi: '#6b4a33',
	roadMinor: 'rgba(43, 26, 20, 0.16)',
	building: 'rgba(43, 26, 20, 0.1)',
	label: '#5b3a29',
	labelStrong: '#33201a',
	labelHalo: 'rgba(240, 231, 216, 0.95)',
	waterLabel: 'rgba(247, 239, 227, 0.5)',
	red: '#d8232a',
	gold: '#f2b134',
	cabinet: '#2b1a14',
	cream: '#f7efe3'
} as const;

const LABEL_FONT = ['Montserrat Medium', 'Open Sans Bold'];
const BOLD_FONT = ['Montserrat Bold', 'Open Sans Bold'];

/**
 * The opening view on a phone: every Canadian Tim Hortons, from Vancouver
 * Island to Newfoundland and up to Whitehorse.
 *
 * Framed as bounds rather than a centre and a zoom because a fixed zoom means
 * a different amount of world on every screen - 3.2 filled a desktop window
 * with Canada and a phone with the Great Lakes.
 */
export const HOME_BOUNDS: [number, number, number, number] = [-135.5, 41.5, -52.0, 64.0];

/**
 * The opening view on a wider screen: the settled corridor from BC to the
 * Maritimes, dipping into the northern US, rather than the whole country out
 * to the empty Arctic. A desktop window has the pixels to spare, so it starts
 * closer in, on the part of the map that is actually full of cups.
 */
export const HOME_BOUNDS_DESKTOP: [number, number, number, number] = [-121.0, 42.0, -63.0, 57.0];

/** Padding around the home view, leaving room for the app's own chrome. */
export const HOME_PADDING = { top: 70, bottom: 160, left: 24, right: 24 };

/**
 * Bounds for the current screen - matches the 900px breakpoint everything
 * else in the layout switches on. Read fresh rather than cached, since the
 * one thing that can change it (a window resize) can happen mid-session.
 */
export function homeBounds(): [number, number, number, number] {
	if (typeof window !== 'undefined' && window.innerWidth >= 900) return HOME_BOUNDS_DESKTOP;
	return HOME_BOUNDS;
}

/** Centre of the mobile home view, for anything that needs a point before the map moves. */
export const HOME_CENTER: [number, number] = [
	(HOME_BOUNDS[0] + HOME_BOUNDS[2]) / 2,
	(HOME_BOUNDS[1] + HOME_BOUNDS[3]) / 2
];

export function trackerStyle(): StyleSpecification {
	return {
		version: 8,
		glyphs: GLYPHS,
		sources: {
			carto: { type: 'vector', url: TILES }
		},
		layers: [
			// The background IS the land in the OpenMapTiles schema; water is
			// painted on top of it.
			{
				id: 'land',
				type: 'background',
				paint: { 'background-color': MAP_COLORS.land }
			},

			// A whisper of tone so huge landmasses are not perfectly flat.
			{
				id: 'landcover',
				type: 'fill',
				source: 'carto',
				'source-layer': 'landcover',
				paint: { 'fill-color': MAP_COLORS.landShade, 'fill-opacity': 0.45 }
			},

			{
				id: 'water',
				type: 'fill',
				source: 'carto',
				'source-layer': 'water',
				paint: { 'fill-color': MAP_COLORS.ocean }
			},
			{
				id: 'waterway',
				type: 'line',
				source: 'carto',
				'source-layer': 'waterway',
				minzoom: 6,
				paint: {
					'line-color': MAP_COLORS.ocean,
					'line-opacity': 0.6,
					'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.5, 14, 2]
				}
			},

			// Dotted political borders, dark on the cream landmass.
			{
				id: 'boundary-country',
				type: 'line',
				source: 'carto',
				'source-layer': 'boundary',
				filter: ['all', ['==', ['get', 'admin_level'], 2], ['==', ['get', 'maritime'], 0]],
				layout: { 'line-cap': 'butt', 'line-join': 'miter' },
				paint: {
					'line-color': MAP_COLORS.border,
					'line-width': 1,
					'line-dasharray': [2, 2]
				}
			},
			{
				id: 'boundary-state',
				type: 'line',
				source: 'carto',
				'source-layer': 'boundary',
				minzoom: 4,
				filter: ['all', ['==', ['get', 'admin_level'], 4], ['==', ['get', 'maritime'], 0]],
				paint: {
					'line-color': MAP_COLORS.borderState,
					'line-width': 1,
					'line-dasharray': [1, 3]
				}
			},

			// Roads only once you are actually navigating to a store.
			{
				id: 'roads',
				type: 'line',
				source: 'carto',
				'source-layer': 'transportation',
				minzoom: 8,
				filter: [
					'match',
					['get', 'class'],
					['motorway', 'trunk', 'primary', 'secondary'],
					true,
					false
				],
				layout: { 'line-cap': 'round', 'line-join': 'round' },
				paint: {
					'line-color': MAP_COLORS.road,
					'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.7, 14, 3, 18, 8]
				}
			},
			{
				id: 'roads-minor',
				type: 'line',
				source: 'carto',
				'source-layer': 'transportation',
				minzoom: 12,
				filter: ['match', ['get', 'class'], ['minor', 'service'], true, false],
				paint: {
					'line-color': MAP_COLORS.roadMinor,
					'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.6, 18, 4.5]
				}
			},

			// Once you are close enough to walk there, blocks and street names
			// are what actually orient you. Without them the screen reads empty.
			{
				id: 'buildings',
				type: 'fill',
				source: 'carto',
				'source-layer': 'building',
				minzoom: 15,
				paint: {
					'fill-color': MAP_COLORS.building,
					'fill-opacity': ['interpolate', ['linear'], ['zoom'], 15, 0, 16.5, 1]
				}
			},
			{
				id: 'label-road',
				type: 'symbol',
				source: 'carto',
				'source-layer': 'transportation_name',
				minzoom: 12,
				layout: {
					'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
					'text-font': BOLD_FONT,
					'text-size': ['interpolate', ['linear'], ['zoom'], 12, 11, 15, 13.5, 18, 16],
					'symbol-placement': 'line',
					'symbol-spacing': 220,
					'text-max-angle': 30
				},
				paint: {
					'text-color': MAP_COLORS.labelStrong,
					'text-opacity': 0.95,
					'text-halo-color': MAP_COLORS.labelHalo,
					'text-halo-width': 2.4
				}
			},

			/*
			 * Landmarks worth navigating by: "the Timmies next to the Superstore".
			 *
			 * Curated hard, because the full POI layer buries the map - in one
			 * Toronto view it carries 339 car parks, 275 neighbourhood gardens
			 * and 170 bus stops. No restaurants or cafes either: they are dense,
			 * rarely how anyone gives directions, and a rival coffee shop beside
			 * our cup is just confusing.
			 *
			 * `rank` is the tiles' own importance ordering, but it is only
			 * comparable within a class - malls sit at rank 2 while a Petro-Canada
			 * is rank 59. So the cap is per group: tight on the dense classes,
			 * loose on the sparse ones that are landmarks whatever their rank.
			 */
			{
				id: 'label-poi',
				type: 'symbol',
				source: 'carto',
				'source-layer': 'poi',
				minzoom: 15,
				filter: [
					'any',
					// Sparse and unmistakable - show them wherever they appear.
					[
						'match',
						['get', 'class'],
						[
							'hospital',
							'railway',
							'aerodrome',
							'ferry_terminal',
							'harbor',
							'museum',
							'cinema',
							'theatre',
							'stadium',
							'town_hall',
							'police',
							'fire_station',
							'castle',
							'monument',
							'zoo',
							'attraction',
							'college'
						],
						true,
						false
					],
					/*
					 * `shop` is where malls live, alongside every corner store. Rank
					 * is per-tile, so downtown a textbook shop can score as low as a
					 * mall does in the suburbs - hence a tight cap here.
					 */
					['all', ['==', ['get', 'class'], 'shop'], ['<=', ['get', 'rank'], 4]],
					/*
					 * `library` is also where bookshops land - a public library ranks
					 * around 6, a comic shop around 20 - so it needs a cap rather
					 * than a free pass.
					 */
					['all', ['==', ['get', 'class'], 'library'], ['<=', ['get', 'rank'], 8]],
					[
						'all',
						['match', ['get', 'class'], ['park', 'school', 'pharmacy', 'art_gallery'], true, false],
						['<=', ['get', 'rank'], 20]
					],
					[
						'all',
						[
							'match',
							['get', 'class'],
							['grocery', 'fuel', 'marketplace', 'department_store', 'alcohol_shop', 'lodging'],
							true,
							false
						],
						['<=', ['get', 'rank'], 60]
					]
				],
				layout: {
					'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
					'text-font': LABEL_FONT,
					'text-size': ['interpolate', ['linear'], ['zoom'], 15, 9.5, 18, 11.5],
					'text-max-width': 7,
					'text-padding': 6,
					// Street names matter more; a landmark can be dropped instead.
					'text-optional': true,
					'symbol-sort-key': ['get', 'rank']
				},
				paint: {
					'text-color': MAP_COLORS.poi,
					'text-opacity': 0.8,
					'text-halo-color': MAP_COLORS.labelHalo,
					'text-halo-width': 1.8
				}
			},

			// Neighbourhood names bridge the gap between "which city" and "which
			// street", which is exactly where orientation was getting lost.
			{
				id: 'label-suburb',
				type: 'symbol',
				source: 'carto',
				'source-layer': 'place',
				minzoom: 11,
				maxzoom: 16,
				filter: [
					'match',
					['get', 'class'],
					['suburb', 'neighbourhood', 'quarter'],
					true,
					false
				],
				layout: {
					'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
					'text-font': LABEL_FONT,
					'text-size': ['interpolate', ['linear'], ['zoom'], 11, 10, 15, 13],
					'text-transform': 'uppercase',
					'text-letter-spacing': 0.14,
					'text-max-width': 8
				},
				paint: {
					'text-color': MAP_COLORS.label,
					'text-opacity': 0.7,
					'text-halo-color': MAP_COLORS.labelHalo,
					'text-halo-width': 2
				}
			},

			// Water names, faint, so the dark half of the screen is not empty.
			// Oceans and lakes are separate layers: rendering every class in one
			// layer labels big bays twice at two different ranks, which reads as
			// a doubled-up glitch rather than a label.
			{
				id: 'label-ocean',
				type: 'symbol',
				source: 'carto',
				'source-layer': 'water_name',
				minzoom: 2,
				filter: ['match', ['get', 'class'], ['ocean', 'sea'], true, false],
				layout: {
					'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
					'text-font': LABEL_FONT,
					'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 6, 12],
					'text-transform': 'uppercase',
					'text-letter-spacing': 0.22,
					'text-max-width': 7
				},
				paint: { 'text-color': MAP_COLORS.waterLabel }
			},
			{
				id: 'label-lake',
				type: 'symbol',
				source: 'carto',
				'source-layer': 'water_name',
				minzoom: 4,
				filter: ['match', ['get', 'class'], ['ocean', 'sea'], false, true],
				layout: {
					'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
					'text-font': LABEL_FONT,
					'text-size': ['interpolate', ['linear'], ['zoom'], 4, 9, 8, 11],
					'text-transform': 'uppercase',
					'text-letter-spacing': 0.18,
					'text-max-width': 7
				},
				paint: { 'text-color': MAP_COLORS.waterLabel }
			},

			// Countries, then regions, then cities - each appearing only when
			// there is room for it.
			{
				id: 'label-country',
				type: 'symbol',
				source: 'carto',
				'source-layer': 'place',
				minzoom: 2,
				maxzoom: 7,
				filter: ['all', ['==', ['get', 'class'], 'country'], ['<=', ['get', 'rank'], 3]],
				layout: {
					'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
					'text-font': BOLD_FONT,
					'text-size': ['interpolate', ['linear'], ['zoom'], 2, 9, 5, 12],
					'text-transform': 'uppercase',
					'text-letter-spacing': 0.16,
					'text-max-width': 8
				},
				paint: {
					'text-color': MAP_COLORS.label,
					'text-opacity': 0.72,
					'text-halo-color': MAP_COLORS.labelHalo,
					'text-halo-width': 1.2
				}
			},
			{
				id: 'label-state',
				type: 'symbol',
				source: 'carto',
				'source-layer': 'place',
				minzoom: 4,
				maxzoom: 9,
				filter: ['==', ['get', 'class'], 'state'],
				layout: {
					'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
					'text-font': LABEL_FONT,
					'text-size': 10,
					'text-transform': 'uppercase',
					'text-letter-spacing': 0.12,
					'text-max-width': 8
				},
				paint: {
					'text-color': MAP_COLORS.label,
					'text-opacity': 0.5,
					'text-halo-color': MAP_COLORS.labelHalo,
					'text-halo-width': 1.2
				}
			},
			{
				id: 'label-city',
				type: 'symbol',
				source: 'carto',
				'source-layer': 'place',
				minzoom: 6,
				filter: [
					'match',
					['get', 'class'],
					['city', 'town'],
					true,
					false
				],
				layout: {
					'text-field': ['coalesce', ['get', 'name_en'], ['get', 'name']],
					'text-font': BOLD_FONT,
					'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 12, 15],
					'text-max-width': 9
				},
				paint: {
					'text-color': MAP_COLORS.labelStrong,
					'text-opacity': 0.88,
					'text-halo-color': MAP_COLORS.labelHalo,
					'text-halo-width': 2
				}
			}
		]
	};
}

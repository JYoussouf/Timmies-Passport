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
	oceanDeep: '#0b1524',
	border: 'rgba(43, 26, 20, 0.38)',
	borderState: 'rgba(43, 26, 20, 0.16)',
	road: 'rgba(43, 26, 20, 0.3)',
	roadMinor: 'rgba(43, 26, 20, 0.16)',
	building: 'rgba(43, 26, 20, 0.1)',
	label: '#5b3a29',
	labelStrong: '#33201a',
	labelHalo: 'rgba(240, 231, 216, 0.95)',
	waterLabel: 'rgba(247, 239, 227, 0.5)',
	red: '#d8232a',
	mint: '#3fa88b',
	gold: '#f2b134',
	cabinet: '#2b1a14',
	cream: '#f7efe3'
} as const;

const LABEL_FONT = ['Montserrat Medium', 'Open Sans Bold'];
const BOLD_FONT = ['Montserrat Bold', 'Open Sans Bold'];

export const INITIAL_VIEW = {
	center: [-92, 49] as [number, number], // Tim's heartland: Canada + northern US
	zoom: 3.2
};

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

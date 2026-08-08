import maplibregl from 'maplibre-gl';
import { trackerStyle } from '$lib/map/style';
import { registerSprites } from '$lib/map/sprites';
import { locations } from '$lib/stores/locations.svelte';
import { passport } from '$lib/stores/passport.svelte';

/**
 * Two small maps of the visitor's own stamps - western hemisphere, then
 * eastern - composited side by side into one plain image with no text of
 * its own. The share preview draws whatever branding, stats or decoration
 * belongs on top of it; this only has to get the cartography right.
 *
 * Built with two throwaway MapLibre instances rather than a second copy of
 * the basemap logic: the live map already knows how to draw this style and
 * cluster these markers, and reusing it means a change to either only ever
 * has to be made once.
 */

/** Wide defaults for a hemisphere with nothing stamped in it yet. */
const DEFAULT_WEST: [number, number, number, number] = [-170, 5, -30, 72];
const DEFAULT_EAST: [number, number, number, number] = [-15, 5, 145, 65];

function boundsOf(points: [number, number][], pad = 6): [number, number, number, number] {
	let minX = Infinity,
		minY = Infinity,
		maxX = -Infinity,
		maxY = -Infinity;
	for (const [x, y] of points) {
		if (x < minX) minX = x;
		if (y < minY) minY = y;
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	}
	return [minX - pad, minY - pad, maxX + pad, maxY + pad];
}

/** One offscreen map, framed on a set of points, rendered to a data URL. */
async function renderPanel(
	container: HTMLDivElement,
	points: [number, number][],
	fallback: [number, number, number, number]
): Promise<string> {
	const bounds = points.length ? boundsOf(points) : fallback;

	const map = new maplibregl.Map({
		container,
		style: trackerStyle(),
		bounds: [
			[bounds[0], bounds[1]],
			[bounds[2], bounds[3]]
		],
		fitBoundsOptions: { padding: 20, maxZoom: 6 },
		interactive: false,
		attributionControl: false,
		preserveDrawingBuffer: true
	});

	try {
		await new Promise<void>((resolve) => map.on('load', () => resolve()));
		registerSprites(map);

		map.addSource('stamps', {
			type: 'geojson',
			cluster: true,
			clusterRadius: 42,
			data: {
				type: 'FeatureCollection',
				features: points.map((p) => ({
					type: 'Feature',
					geometry: { type: 'Point', coordinates: p },
					properties: {}
				}))
			}
		});
		map.addLayer({
			id: 'stamp-clusters',
			type: 'symbol',
			source: 'stamps',
			filter: ['has', 'point_count'],
			layout: {
				'icon-image': 'pin-unstamped',
				'icon-size': ['step', ['get', 'point_count'], 1.1, 10, 1.6, 40, 2.1],
				'icon-allow-overlap': true,
				'text-field': ['get', 'point_count_abbreviated'],
				'text-font': ['Montserrat Bold', 'Open Sans Bold'],
				'text-size': 13,
				'text-offset': [0, 0.3],
				'text-allow-overlap': true
			},
			paint: { 'text-color': '#150d0a' }
		});
		map.addLayer({
			id: 'stamp-points',
			type: 'symbol',
			source: 'stamps',
			filter: ['!', ['has', 'point_count']],
			layout: {
				'icon-image': 'pin-unstamped',
				'icon-size': 1.15,
				'icon-allow-overlap': true,
				// A lone stamp is a count of one, and wears it like the clusters do.
				'text-field': '1',
				'text-font': ['Montserrat Bold', 'Open Sans Bold'],
				'text-size': 13,
				'text-offset': [0, 0.3],
				'text-allow-overlap': true
			},
			paint: { 'text-color': '#150d0a' }
		});

		// fitBounds at construction can settle before every tile has painted.
		await new Promise<void>((resolve) => {
			map.once('idle', () => resolve());
		});

		return map.getCanvas().toDataURL('image/png');
	} finally {
		map.remove();
	}
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

export interface PassportImageStats {
	count: number;
	total: number;
	countries: number;
	countryTotal: number;
	provinces: number;
	provinceTotal: number;
}

/**
 * The same numbers the passport page's three bars show, computed once here
 * so the image and the button that shares it never disagree about them.
 */
export function passportStats(): PassportImageStats {
	return {
		count: passport.count,
		total: locations.total,
		countries: passport.countriesVisited.size,
		countryTotal: locations.countryTotal,
		provinces: passport.provincesVisited.size,
		provinceTotal: locations.provinceTotal
	};
}

/**
 * Renders just the cartography: two panels side by side, sized to fill
 * `width` Γ— `height` exactly, so a caller compositing this into a fixed slot
 * (an SVG frame, say) never has to stretch it. Returns null rather than
 * throwing when the browser cannot produce it - no WebGL, an ad blocker
 * eating the canvas, whatever else - so the share button can fall back to a
 * text-only share instead of leaving the visitor stuck on a spinner.
 */
export async function renderStampMosaic(width = 1290, height = 510): Promise<Blob | null> {
	if (typeof document === 'undefined') return null;

	const west: [number, number][] = [];
	const east: [number, number][] = [];
	for (const id of passport.visitedIds) {
		const c = locations.coordsOf(id);
		if (!c) continue;
		(c[0] < 0 ? west : east).push(c);
	}

	const gap = Math.round(width * 0.018);
	const panelW = Math.round((width - gap) / 2);
	const panelH = height;

	// Off-screen but still laid out - a display:none container never gets a
	// WebGL context sized correctly, or sometimes any context at all.
	const stage = document.createElement('div');
	stage.style.cssText = `position:fixed;left:-10000px;top:0;width:${panelW}px;height:${panelH}px;`;
	document.body.appendChild(stage);

	try {
		const [westUrl, eastUrl] = await Promise.all([
			renderPanel(stage, west, DEFAULT_WEST),
			renderPanel(stage, east, DEFAULT_EAST)
		]);
		const [westImg, eastImg] = await Promise.all([loadImage(westUrl), loadImage(eastUrl)]);

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		ctx.drawImage(westImg, 0, 0, panelW, panelH);
		ctx.drawImage(eastImg, panelW + gap, 0, width - panelW - gap, panelH);

		return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
	} catch {
		return null;
	} finally {
		stage.remove();
	}
}

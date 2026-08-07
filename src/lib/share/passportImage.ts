import maplibregl from 'maplibre-gl';
import { trackerStyle } from '$lib/map/style';
import { registerSprites } from '$lib/map/sprites';
import { locations } from '$lib/stores/locations.svelte';
import { passport } from '$lib/stores/passport.svelte';
import { APP_NAME_OWNED, DISCLAIMER, SITE_URL } from '$lib/brand';

/**
 * Renders the passport as one shareable image: two small maps of the
 * visitor's own stamps - western hemisphere, then eastern - and the same
 * three progress bars the passport page shows, redrawn in a plain sans-serif
 * rather than the pixel font, because ten stamps' worth of numbers need to
 * read clearly at export size, not look like the arcade cabinet's chrome.
 *
 * Built with two throwaway MapLibre instances rather than a second copy of
 * the basemap logic: the live map already knows how to draw this style and
 * cluster these markers, and reusing it means a change to either only ever
 * has to be made once.
 */

const CANVAS_W = 1200;
const CANVAS_H = 900;
const PANEL_W = 552;
const PANEL_H = 460;
const PANEL_Y = 190;
const PANEL_GAP = 24;
const PANEL_L_X = (CANVAS_W - PANEL_W * 2 - PANEL_GAP) / 2;
const PANEL_R_X = PANEL_L_X + PANEL_W + PANEL_GAP;

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
				'icon-allow-overlap': true
			}
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

function drawBar(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	label: string,
	valueText: string,
	pct: number,
	color: string
) {
	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = 'rgba(247, 239, 227, 0.75)';
	ctx.font = '600 17px Inter, sans-serif';
	ctx.textAlign = 'left';
	ctx.fillText(label, x, y);
	ctx.fillStyle = '#f7efe3';
	ctx.textAlign = 'right';
	ctx.fillText(valueText, x + w, y);

	const trackY = y + 14;
	const trackH = 12;
	ctx.fillStyle = 'rgba(247, 239, 227, 0.12)';
	ctx.fillRect(x, trackY, w, trackH);
	ctx.fillStyle = color;
	ctx.fillRect(x, trackY, Math.max(4, w * Math.min(1, pct)), trackH);
}

/**
 * The full render. Returns null rather than throwing when the browser cannot
 * produce it (no WebGL, an ad blocker eating the canvas, whatever else) -
 * the share button falls back to a text-only share in that case rather than
 * leaving the visitor stuck on a spinner.
 */
export async function renderPassportImage(stats: PassportImageStats): Promise<Blob | null> {
	if (typeof document === 'undefined') return null;

	const west: [number, number][] = [];
	const east: [number, number][] = [];
	for (const id of passport.visitedIds) {
		const c = locations.coordsOf(id);
		if (!c) continue;
		(c[0] < 0 ? west : east).push(c);
	}

	// Off-screen but still laid out - a display:none container never gets a
	// WebGL context sized correctly, or sometimes any context at all.
	const stage = document.createElement('div');
	stage.style.cssText = `position:fixed;left:-10000px;top:0;width:${PANEL_W}px;height:${PANEL_H}px;`;
	document.body.appendChild(stage);

	try {
		await document.fonts.load('700 22px Inter');
		await document.fonts.load('600 17px Inter');

		const [westUrl, eastUrl] = await Promise.all([
			renderPanel(stage, west, DEFAULT_WEST),
			renderPanel(stage, east, DEFAULT_EAST)
		]);
		const [westImg, eastImg] = await Promise.all([loadImage(westUrl), loadImage(eastUrl)]);

		const canvas = document.createElement('canvas');
		canvas.width = CANVAS_W;
		canvas.height = CANVAS_H;
		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		// Cabinet background.
		ctx.fillStyle = '#2b1a14';
		ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

		// Branding, top left.
		ctx.fillStyle = '#f2b134';
		ctx.font = '700 30px Inter, sans-serif';
		ctx.textAlign = 'left';
		ctx.textBaseline = 'alphabetic';
		ctx.fillText('☕ ' + APP_NAME_OWNED, 40, 62);
		ctx.fillStyle = 'rgba(247, 239, 227, 0.6)';
		ctx.font = '400 16px Inter, sans-serif';
		ctx.fillText(SITE_URL.replace('https://', ''), 40, 90);

		// Disclaimer, top right corner - small, out of the way of the numbers.
		ctx.textAlign = 'right';
		ctx.font = '400 12px Inter, sans-serif';
		ctx.fillStyle = 'rgba(247, 239, 227, 0.45)';
		wrapRight(ctx, DISCLAIMER, CANVAS_W - 40, 52, 340, 15);

		// The two panels, each in its own bevelled frame.
		for (const [img, x] of [
			[westImg, PANEL_L_X],
			[eastImg, PANEL_R_X]
		] as const) {
			ctx.drawImage(img, x, PANEL_Y, PANEL_W, PANEL_H);
			ctx.strokeStyle = 'rgba(247, 239, 227, 0.18)';
			ctx.lineWidth = 2;
			ctx.strokeRect(x + 1, PANEL_Y + 1, PANEL_W - 2, PANEL_H - 2);
		}

		// Three bars, side by side beneath the maps.
		const barsY = PANEL_Y + PANEL_H + 70;
		const barW = (CANVAS_W - 80 - PANEL_GAP * 2) / 3;
		drawBar(
			ctx,
			40,
			barsY,
			barW,
			'TIMMIES',
			`${stats.count.toLocaleString()} / ${stats.total.toLocaleString()}`,
			stats.total ? stats.count / stats.total : 0,
			'#d8232a'
		);
		drawBar(
			ctx,
			40 + barW + PANEL_GAP,
			barsY,
			barW,
			'COUNTRIES',
			`${stats.countries} / ${stats.countryTotal}`,
			stats.countryTotal ? stats.countries / stats.countryTotal : 0,
			'#3ed957'
		);
		drawBar(
			ctx,
			40 + (barW + PANEL_GAP) * 2,
			barsY,
			barW,
			'PROVINCES',
			`${stats.provinces} / ${stats.provinceTotal}`,
			stats.provinceTotal ? stats.provinces / stats.provinceTotal : 0,
			'#f2b134'
		);

		return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
	} catch {
		return null;
	} finally {
		stage.remove();
	}
}

/** Right-aligned word wrap - canvas has no built-in version of this. */
function wrapRight(
	ctx: CanvasRenderingContext2D,
	text: string,
	rightX: number,
	y: number,
	maxWidth: number,
	lineHeight: number
) {
	const words = text.split(' ');
	let line = '';
	const lines: string[] = [];
	for (const w of words) {
		const test = line ? `${line} ${w}` : w;
		if (ctx.measureText(test).width > maxWidth && line) {
			lines.push(line);
			line = w;
		} else {
			line = test;
		}
	}
	if (line) lines.push(line);
	lines.forEach((l, i) => ctx.fillText(l, rightX, y + i * lineHeight));
}

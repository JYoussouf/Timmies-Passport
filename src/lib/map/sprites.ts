import type maplibregl from 'maplibre-gl';
import { MAP_COLORS } from './style';
import { CUP, CUP_W, CUP_H, cupPalette, cupPaletteClosed, GREEN_HUE } from '$lib/art/cup';

/**
 * Marker art, drawn as literal pixel grids and upscaled with nearest-neighbour.
 *
 * Building the RGBA buffer by hand (rather than rasterising an SVG) is what
 * keeps the edges hard: every source cell becomes an exact NxN block, so the
 * markers stay chunky pixel art at any device pixel ratio instead of turning
 * into smooth antialiased circles.
 */

type RGBA = readonly [number, number, number, number];

const CLEAR: RGBA = [0, 0, 0, 0];

/** #rrggbb plus optional alpha 0..1 → RGBA tuple. */
function hex(h: string, a = 1): RGBA {
	const s = h.replace('#', '');
	return [
		parseInt(s.slice(0, 2), 16),
		parseInt(s.slice(2, 4), 16),
		parseInt(s.slice(4, 6), 16),
		Math.round(a * 255)
	];
}

const C = { gold: hex(MAP_COLORS.gold) } as const;

/** A grid of RGBA cells, drawn at "art" resolution. */
class Grid {
	readonly cells: RGBA[];

	constructor(
		readonly w: number,
		readonly h: number
	) {
		this.cells = new Array(w * h).fill(CLEAR);
	}

	set(x: number, y: number, c: RGBA) {
		if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
		this.cells[y * this.w + x] = c;
	}

	/** Upscale by `scale` with nearest-neighbour into a MapLibre image. */
	toImage(scale: number): { width: number; height: number; data: Uint8Array } {
		const w = this.w * scale;
		const h = this.h * scale;
		const data = new Uint8Array(w * h * 4);
		for (let y = 0; y < h; y++) {
			for (let x = 0; x < w; x++) {
				const [r, g, b, a] = this.cells[((y / scale) | 0) * this.w + ((x / scale) | 0)];
				const i = (y * w + x) * 4;
				data[i] = r;
				data[i + 1] = g;
				data[i + 2] = b;
				data[i + 3] = a;
			}
		}
		return { width: w, height: h, data };
	}
}

/** The shared cup art, re-hued for the collected state or drained for a closure. */
function cup(hue?: number, palette = cupPalette(hue)): Grid {
	const rgba = new Map(Object.entries(palette).map(([ch, h]) => [ch, hex(h)]));
	const g = new Grid(CUP_W, CUP_H);
	CUP.forEach((row, y) => {
		[...row].forEach((ch, x) => {
			const c = rgba.get(ch);
			if (c) g.set(x, y, c);
		});
	});
	return g;
}

/** Four corner brackets - the selection reticle, framing the cup. */
function reticle(w: number, h: number): Grid {
	const g = new Grid(w, h);
	const arm = 5;
	const put = (x: number, y: number) => g.set(x, y, C.gold);
	for (let i = 0; i < arm; i++) {
		put(i, 0);
		put(0, i);
		put(w - 1 - i, 0);
		put(w - 1, i);
		put(i, h - 1);
		put(0, h - 1 - i);
		put(w - 1 - i, h - 1);
		put(w - 1, h - 1 - i);
	}
	return g;
}

/**
 * Rendered at 2x and registered with pixelRatio 2, so one art cell occupies one
 * CSS pixel - the drawing is detailed enough that larger cells would make the
 * markers enormous.
 */
const SCALE = 2;
const PIXEL_RATIO = 2;

function buildAll(): Record<string, Grid> {
	// Clusters reuse the unstamped cup, just scaled up with the count printed
	// on the body, so the map speaks one shape at every zoom level.
	return {
		'pin-unstamped': cup(),
		'pin-stamped': cup(GREEN_HUE),
		'pin-closed': cup(undefined, cupPaletteClosed()),
		reticle: reticle(CUP_W + 4, CUP_H + 4)
	};
}

/** Register every sprite on a loaded map. Safe to call more than once. */
export function registerSprites(map: maplibregl.Map) {
	for (const [id, grid] of Object.entries(buildAll())) {
		if (map.hasImage(id)) continue;
		map.addImage(id, grid.toImage(SCALE), { pixelRatio: PIXEL_RATIO });
	}
}

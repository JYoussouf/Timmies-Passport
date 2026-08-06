import type maplibregl from 'maplibre-gl';
import { MAP_COLORS } from './style';
import { CUP, CUP_SIZE } from '$lib/art/cup';

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

const C = {
	red: hex(MAP_COLORS.red),
	mint: hex(MAP_COLORS.mint),
	cream: hex('#fffaf2'),
	gold: hex(MAP_COLORS.gold)
} as const;

/** A square grid of RGBA cells, drawn at "art" resolution. */
class Grid {
	readonly cells: RGBA[];

	constructor(readonly size: number) {
		this.cells = new Array(size * size).fill(CLEAR);
	}

	set(x: number, y: number, c: RGBA) {
		if (x < 0 || y < 0 || x >= this.size || y >= this.size) return;
		this.cells[y * this.size + x] = c;
	}

	/** Upscale by `scale` with nearest-neighbour into a MapLibre image. */
	toImage(scale: number): { width: number; height: number; data: Uint8Array } {
		const w = this.size * scale;
		const data = new Uint8Array(w * w * 4);
		for (let y = 0; y < w; y++) {
			for (let x = 0; x < w; x++) {
				const [r, g, b, a] = this.cells[((y / scale) | 0) * this.size + ((x / scale) | 0)];
				const i = (y * w + x) * 4;
				data[i] = r;
				data[i + 1] = g;
				data[i + 2] = b;
				data[i + 3] = a;
			}
		}
		return { width: w, height: w, data };
	}
}

/** The shared cup bitmap, inked in a given outline colour. */
function cup(outline: RGBA, fill: RGBA = C.cream): Grid {
	const g = new Grid(CUP_SIZE);
	CUP.forEach((row, y) => {
		[...row].forEach((ch, x) => {
			if (ch === 'O') g.set(x, y, outline);
			else if (ch === '#') g.set(x, y, fill);
		});
	});
	return g;
}

/** Four corner brackets - the selection reticle. */
function reticle(size: number): Grid {
	const g = new Grid(size);
	const arm = 4;
	const put = (x: number, y: number) => g.set(x, y, C.gold);
	for (let i = 0; i < arm; i++) {
		put(i, 0);
		put(0, i);
		put(size - 1 - i, 0);
		put(size - 1, i);
		put(i, size - 1);
		put(0, size - 1 - i);
		put(size - 1 - i, size - 1);
		put(size - 1, size - 1 - i);
	}
	return g;
}

/**
 * Rendered at 4x and registered with pixelRatio 2, so one art cell occupies
 * two CSS pixels - chunky, but still sharp on retina displays.
 */
const SCALE = 4;
const PIXEL_RATIO = 2;

function buildAll(): Record<string, Grid> {
	// Clusters reuse the unstamped cup, just scaled up with the count printed
	// on the body, so the map speaks one shape at every zoom level.
	return {
		'pin-unstamped': cup(C.red),
		'pin-stamped': cup(C.mint),
		reticle: reticle(19)
	};
}

/** Register every sprite on a loaded map. Safe to call more than once. */
export function registerSprites(map: maplibregl.Map) {
	for (const [id, grid] of Object.entries(buildAll())) {
		if (map.hasImage(id)) continue;
		map.addImage(id, grid.toImage(SCALE), { pixelRatio: PIXEL_RATIO });
	}
}

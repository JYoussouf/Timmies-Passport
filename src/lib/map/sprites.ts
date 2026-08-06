import type maplibregl from 'maplibre-gl';
import { MAP_COLORS } from './style';

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

/** #rrggbb (or #rgb) plus optional alpha 0..1 → RGBA tuple. */
function hex(h: string, a = 1): RGBA {
	const s = h.replace('#', '');
	const full = s.length === 3 ? s[0] + s[0] + s[1] + s[1] + s[2] + s[2] : s;
	return [
		parseInt(full.slice(0, 2), 16),
		parseInt(full.slice(2, 4), 16),
		parseInt(full.slice(4, 6), 16),
		Math.round(a * 255)
	];
}

const C = {
	red: hex(MAP_COLORS.red),
	redDark: hex('#7d1216'),
	mint: hex(MAP_COLORS.mint),
	mintDark: hex('#10352b'),
	mintGlow: hex(MAP_COLORS.mint, 0.28),
	cream: hex(MAP_COLORS.cream),
	white: hex('#fffaf2'),
	gold: hex(MAP_COLORS.gold),
	goldHi: hex('#ffd479'),
	goldLo: hex('#c88d1c'),
	cabinet: hex(MAP_COLORS.cabinet),
	cabinetHi: hex('#4a2e23'),
	cabinetLo: hex('#0f0806'),
	shadow: hex('#2b1a14', 0.25)
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

	/** Distance of a cell from the grid centre, in cells. */
	dist(x: number, y: number) {
		const c = (this.size - 1) / 2;
		return Math.hypot(x - c, y - c);
	}

	/** Fill every cell whose distance falls in [min, max). */
	ring(min: number, max: number, c: RGBA) {
		for (let y = 0; y < this.size; y++) {
			for (let x = 0; x < this.size; x++) {
				const d = this.dist(x, y);
				if (d >= min && d < max) this.set(x, y, c);
			}
		}
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

/**
 * A donut: outer rim, coloured band, hole punched through the middle.
 * `sprinkles` are cell offsets from centre, painted in cream.
 */
function donut(opts: {
	size: number;
	outer: number;
	inner: number;
	band: RGBA;
	rim: RGBA;
	glow?: RGBA;
	sprinkles?: [number, number][];
}): Grid {
	const g = new Grid(opts.size);
	if (opts.glow) g.ring(opts.outer, opts.outer + 2.2, opts.glow);
	g.ring(opts.inner, opts.outer, opts.band);
	// Darker rim on the outside edge only, so the donut keeps a clean hole.
	g.ring(opts.outer - 1.15, opts.outer, opts.rim);

	const c = (opts.size - 1) / 2;
	for (const [dx, dy] of opts.sprinkles ?? []) g.set(c + dx, c + dy, C.cream);
	return g;
}

/** A beveled square plate: light top/left, dark bottom/right, coloured border. */
function plate(size: number, fill: RGBA, border: RGBA, hi: RGBA, lo: RGBA): Grid {
	const g = new Grid(size);
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1;
			const bevel = x === 1 || y === 1 || x === size - 2 || y === size - 2;
			if (edge) g.set(x, y, border);
			else if (bevel) g.set(x, y, x === size - 2 || y === size - 2 ? lo : hi);
			else g.set(x, y, fill);
		}
	}
	return g;
}

/** Four corner brackets — the selection reticle. */
function reticle(size: number): Grid {
	const g = new Grid(size);
	const arm = 4;
	const put = (x: number, y: number) => g.set(x, y, C.gold);
	for (let i = 0; i < arm; i++) {
		// top-left
		put(i, 0);
		put(0, i);
		// top-right
		put(size - 1 - i, 0);
		put(size - 1, i);
		// bottom-left
		put(i, size - 1);
		put(0, size - 1 - i);
		// bottom-right
		put(size - 1 - i, size - 1);
		put(size - 1, size - 1 - i);
	}
	return g;
}

/**
 * Every sprite the map uses, keyed by image id.
 * Rendered at 4x and registered with pixelRatio 2, so one art cell occupies
 * two CSS pixels — chunky, but still sharp on retina displays.
 */
const SCALE = 4;
const PIXEL_RATIO = 2;

function buildAll(): Record<string, Grid> {
	return {
		// A solid ring with the hole punched clean through. Colour alone
		// separates the two states — layering extra bands inside a 10px donut
		// just turns it into concentric noise.
		'pin-unstamped': donut({
			size: 11,
			outer: 5,
			inner: 1.9,
			band: C.red,
			rim: C.redDark
		}),
		'pin-stamped': donut({
			size: 15,
			outer: 5,
			inner: 1.9,
			band: C.mint,
			rim: C.mintDark,
			glow: C.mintGlow,
			sprinkles: [
				[-2, -3],
				[2, -2],
				[-3, 1],
				[1, 3],
				[3, 1]
			]
		}),
		'cluster-sm': plate(13, C.cabinet, C.gold, C.cabinetHi, C.cabinetLo),
		'cluster-md': plate(17, C.cabinet, C.gold, C.cabinetHi, C.cabinetLo),
		'cluster-lg': plate(21, C.cabinet, C.goldHi, C.cabinetHi, C.cabinetLo),
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

/**
 * The Tim Hortons cup, transcribed from `static/art/coffee-cup-8bit.png`.
 *
 * The PNG is the drawing; this is the same art as a pixel grid so it can be
 * both recoloured and rendered crisply at any size. The map sprite builder and
 * `CupIcon.svelte` both read from here, so the marker and the legend cannot
 * drift apart, and neither needs to fetch an image at runtime.
 *
 * Regenerate by re-running the extraction in the commit that added this file.
 * `.` is transparent; every other character indexes 9 palette entries.
 */

export const CUP_W = 26;
export const CUP_H = 31;

export const CUP_PALETTE: Record<string, string> = {
	a: '#787884',
	b: '#ffffff',
	c: '#eeeef2',
	d: '#cbcbd3',
	e: '#580612',
	f: '#920c1c',
	g: '#f55a64',
	h: '#de1e2d',
	i: '#ba1424'
};

/**
 * The saturated (cup body) entries. Only these are re-hued for the collected
 * state; the lid stays grey so a mint cup still reads as the same object.
 */
export const CUP_BODY = new Set(['e', 'f', 'g', 'h', 'i']);

export const CUP = [
	'..aaaaaaaaaaaaaaaaaaaaaa..',
	'.abcccccccccccccccccccdda.',
	'.abcccccccccccccccccccdda.',
	'abcccccccccccccccccccccdda',
	'abcccccccccccccccccccccdda',
	'adddddddddddddddddddddddda',
	'.effffffffffffffffffffffe.',
	'.effffffffffffffffffffffe.',
	'.egghhhhhhhhhhhhhhhhhhife.',
	'.egghhhhhhhhhhhhhhhhhhife.',
	'.egghhhhhhhhhhhhhhhhhhife.',
	'.egghhhhhhhhhhhhhhhhhhife.',
	'.egghhhhhhhhhhhhhhhhhhife.',
	'.egghhhhhhhhhhhhhhhhhhife.',
	'..egghhhhhhhhhhhhhhhhife..',
	'..egghhhhhhhhhhhhhhhhife..',
	'..egghhhhhhhhhhhhhhhhife..',
	'..egghhhhhhhhhhhhhhhhife..',
	'..egghhhhhhhhhhhhhhhhife..',
	'..egghhhhhhhhhhhhhhhhife..',
	'..egghhhhhhhhhhhhhhhhife..',
	'..egghhhhhhhhhhhhhhhhife..',
	'...egghhhhhhhhhhhhhhife...',
	'...egghhhhhhhhhhhhhhife...',
	'...egghhhhhhhhhhhhhhife...',
	'...egghhhhhhhhhhhhhhife...',
	'...egghhhhhhhhhhhhhhife...',
	'...egghhhhhhhhhhhhhhife...',
	'...egghhhhhhhhhhhhhhife...',
	'....eeiiiiiiiiiiiiiiee....',
	'......eeeeeeeeeeeeee......'
] as const;

// --- Recolouring -----------------------------------------------------------
// The collected state re-hues the body while keeping each shade's saturation
// and lightness, so the drawing's shading ramp survives the colour change.

function hexToHsl(hex: string): [number, number, number] {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const l = (max + min) / 2;
	const d = max - min;
	if (!d) return [0, 0, l];
	const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
	const h =
		max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
	return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
	const k = (n: number) => (n + h / 30) % 12;
	const a = s * Math.min(l, 1 - l);
	const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
	const to = (v: number) =>
		Math.round(v * 255)
			.toString(16)
			.padStart(2, '0');
	return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

/** Hue of the default (unstamped) cup body, so shifts are relative to the art. */
const BODY_HUE = hexToHsl(CUP_PALETTE.h)[0];

/**
 * The palette with the body re-hued to `hue` degrees. Passing `undefined`
 * returns the drawing untouched.
 */
export function cupPalette(hue?: number): Record<string, string> {
	if (hue === undefined) return CUP_PALETTE;
	const out: Record<string, string> = {};
	for (const [ch, hex] of Object.entries(CUP_PALETTE)) {
		if (!CUP_BODY.has(ch)) {
			out[ch] = hex;
			continue;
		}
		const [h, s, l] = hexToHsl(hex);
		out[ch] = hslToHex(h - BODY_HUE + hue, s, l);
	}
	return out;
}

/** Hue of the collected state, matching the mint used across the UI. */
export const MINT_HUE = hexToHsl('#3fa88b')[0];

/**
 * Horizontal runs of identical cells, so consumers emit one rect per run
 * instead of one per pixel.
 */
export function cupRuns(): { x: number; y: number; w: number; ch: string }[] {
	const runs: { x: number; y: number; w: number; ch: string }[] = [];
	CUP.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			const ch = row[x];
			let w = 1;
			while (x + w < row.length && row[x + w] === ch) w++;
			if (ch !== '.') runs.push({ x, y, w, ch });
			x += w;
		}
	});
	return runs;
}

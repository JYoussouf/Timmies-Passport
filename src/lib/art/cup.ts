/**
 * The Tim Hortons cup, as a pixel bitmap.
 *
 * This is the single source of truth for the icon: the map sprites rasterise
 * it to RGBA, and `CupIcon.svelte` emits the same grid as SVG rects. Drawing it
 * twice would guarantee the marker and the legend eventually drift apart.
 *
 * The lid is a solid band rather than an outlined one: at 12px a hollow lid
 * reads as a bucket rim, while a solid one reads as a takeaway cup.
 *
 *   `.` transparent   `O` outline (brand colour)   `#` fill (cream)
 */
export const CUP = [
	'............',
	'.OOOOOOOOOO.',
	'.OOOOOOOOOO.',
	'..O######O..',
	'..O######O..',
	'..O######O..',
	'...O####O...',
	'...O####O...',
	'...O####O...',
	'....OOOO....',
	'............',
	'............'
] as const;

export const CUP_SIZE = CUP.length;

export type CupCell = 'outline' | 'fill';

/**
 * Horizontal runs of identical cells, so consumers emit one rect per run
 * instead of one per pixel.
 */
export function cupRuns(): { x: number; y: number; w: number; cell: CupCell }[] {
	const runs: { x: number; y: number; w: number; cell: CupCell }[] = [];
	CUP.forEach((row, y) => {
		let x = 0;
		while (x < row.length) {
			const ch = row[x];
			let w = 1;
			while (x + w < row.length && row[x + w] === ch) w++;
			if (ch !== '.') runs.push({ x, y, w, cell: ch === 'O' ? 'outline' : 'fill' });
			x += w;
		}
	});
	return runs;
}

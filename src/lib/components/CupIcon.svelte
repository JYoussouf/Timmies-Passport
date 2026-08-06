<script lang="ts">
	/**
	 * The cup icon, drawn from the same bitmap the map markers use.
	 * Colours come from CSS so a cup can be red, mint, or gold in place.
	 */
	import { cupRuns, CUP_SIZE } from '$lib/art/cup';

	let {
		size = 24,
		outline = 'var(--tim-red)',
		fill = 'var(--cream)'
	}: { size?: number; outline?: string; fill?: string } = $props();

	const runs = cupRuns();

	/**
	 * Snap to a whole number of device pixels per cell. At an arbitrary size
	 * each cell lands on a fraction of a pixel and `crispEdges` rounds them
	 * independently, so the grid comes out uneven and the cup reads as a blur.
	 */
	const px = $derived(Math.max(1, Math.round(size / CUP_SIZE)) * CUP_SIZE);
</script>

<svg
	class="cup"
	width={px}
	height={px}
	viewBox="0 0 {CUP_SIZE} {CUP_SIZE}"
	aria-hidden="true"
	focusable="false"
	shape-rendering="crispEdges"
>
	{#each runs as r (`${r.x}-${r.y}`)}
		<rect
			x={r.x}
			y={r.y}
			width={r.w}
			height="1"
			fill={r.cell === 'outline' ? outline : fill}
		/>
	{/each}
</svg>

<style>
	.cup {
		display: block;
		flex: none;
	}
</style>

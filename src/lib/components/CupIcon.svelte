<script lang="ts">
	/**
	 * The cup icon, drawn from the same art the map markers use.
	 * `collected` re-hues the body to mint and leaves the lid alone.
	 */
	import { cupRuns, cupPalette, CUP_W, CUP_H, MINT_HUE } from '$lib/art/cup';

	let { height = 24, collected = false }: { height?: number; collected?: boolean } = $props();

	const runs = cupRuns();

	/**
	 * With at least a pixel per cell, snap to a whole number and render hard
	 * edges - otherwise cells land on fractions of a pixel and `crispEdges`
	 * rounds each one independently, leaving an uneven grid.
	 *
	 * Below that the art is being shown smaller than it was drawn, so let the
	 * browser resample it smoothly instead; forcing hard edges there drops
	 * whole rows of the drawing.
	 */
	const raw = $derived(height / CUP_H);
	const cell = $derived(raw >= 1 ? Math.round(raw) : raw);
	const crisp = $derived(raw >= 1);
	const palette = $derived(cupPalette(collected ? MINT_HUE : undefined));
</script>

<svg
	class="cup"
	width={CUP_W * cell}
	height={CUP_H * cell}
	viewBox="0 0 {CUP_W} {CUP_H}"
	aria-hidden="true"
	focusable="false"
	shape-rendering={crisp ? 'crispEdges' : 'auto'}
>
	{#each runs as r (`${r.x}-${r.y}`)}
		<rect x={r.x} y={r.y} width={r.w} height="1" fill={palette[r.ch]} />
	{/each}
</svg>

<style>
	.cup {
		display: block;
		flex: none;
	}
</style>

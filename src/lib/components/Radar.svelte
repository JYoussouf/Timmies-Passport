<script lang="ts">
	/**
	 * Desktop-only viewport indicator. On a phone the map already tells you
	 * where you are, and the plate would just eat screen, so it is not rendered.
	 */
	let { center }: { center: { lng: number; lat: number } } = $props();

	// Equirectangular projection into the 100x100 viewBox.
	const dot = $derived({
		x: ((center.lng + 180) / 360) * 100,
		y: ((90 - center.lat) / 180) * 100
	});
</script>

<div class="radar" aria-hidden="true">
	<svg viewBox="0 0 100 100" role="presentation">
		<rect x="0" y="0" width="100" height="100" fill="var(--screen-deep)" />
		<g stroke="rgba(247,239,227,0.16)" stroke-width="0.6">
			<line x1="0" y1="50" x2="100" y2="50" />
			<line x1="50" y1="0" x2="50" y2="100" />
			<line x1="0" y1="25" x2="100" y2="25" />
			<line x1="0" y1="75" x2="100" y2="75" />
			<line x1="25" y1="0" x2="25" y2="100" />
			<line x1="75" y1="0" x2="75" y2="100" />
		</g>
		<circle cx="50" cy="50" r="30" fill="none" stroke="rgba(247,239,227,0.12)" stroke-width="0.6" />
		<line x1={dot.x} y1="0" x2={dot.x} y2="100" stroke="var(--gold)" stroke-width="0.7" opacity="0.5" />
		<line x1="0" y1={dot.y} x2="100" y2={dot.y} stroke="var(--gold)" stroke-width="0.7" opacity="0.5" />
		<rect x={dot.x - 3} y={dot.y - 3} width="6" height="6" fill="var(--gold)" />
	</svg>
	<span class="coords pixel">
		{Math.abs(center.lat).toFixed(1)}{center.lat >= 0 ? 'N' : 'S'}
		{Math.abs(center.lng).toFixed(1)}{center.lng >= 0 ? 'E' : 'W'}
	</span>
</div>

<style>
	.radar {
		display: none;
	}

	@media (min-width: 900px) {
		.radar {
			position: absolute;
			right: 14px;
			bottom: 46px;
			z-index: 19;
			display: block;
			width: 132px;
			padding: 4px;
			background: var(--cabinet);
			border-top: 2px solid var(--cabinet-hi);
			border-left: 2px solid var(--cabinet-hi);
			border-right: 2px solid var(--cabinet-lo);
			border-bottom: 2px solid var(--cabinet-lo);
			box-shadow: var(--bevel-md);
			pointer-events: none;
		}
		.radar svg {
			display: block;
			width: 100%;
			height: auto;
		}
		.coords {
			display: block;
			margin-top: 4px;
			text-align: center;
			font-size: 0.42rem;
			color: var(--gold);
		}
	}

	/* Short desktop windows need that corner for the zoom controls. */
	@media (min-width: 900px) and (max-height: 620px) {
		.radar {
			display: none;
		}
	}
</style>

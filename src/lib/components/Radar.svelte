<script lang="ts">
	/**
	 * Local radar: the Timmies around wherever you are looking, red for
	 * unstamped and mint for collected, on a crosshair grid.
	 *
	 * It deliberately tracks the map's own scale rather than showing a fixed
	 * world outline - a dot on a world map repeats what the map already says,
	 * whereas this answers "what is near me right now".
	 *
	 * Desktop only. On a phone the map itself is the radar.
	 */
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';

	let { center }: { center: { lng: number; lat: number; zoom: number } } = $props();

	/** Half-width of the radar in degrees of longitude, tied to map zoom. */
	const span = $derived(Math.min(120, 180 / Math.pow(2, Math.max(0, center.zoom - 1))));

	const blips = $derived(
		locations.sampleAround(center.lng, center.lat, span).map((l) => ({
			id: l.id,
			// Latitude is inverted: north is up.
			x: 50 + ((l.lng - center.lng) / span) * 50,
			y: 50 - ((l.lat - center.lat) / span) * 50,
			visited: passport.isVisited(l.id)
		}))
	);
</script>

<div class="radar">
	<svg viewBox="0 0 100 100" role="img" aria-label="{blips.length} Tim Hortons near this view">
		<rect x="0" y="0" width="100" height="100" fill="var(--screen-deep)" />
		<g stroke="rgba(247,239,227,0.14)" stroke-width="0.6">
			<line x1="0" y1="25" x2="100" y2="25" />
			<line x1="0" y1="75" x2="100" y2="75" />
			<line x1="25" y1="0" x2="25" y2="100" />
			<line x1="75" y1="0" x2="75" y2="100" />
		</g>
		<g stroke="var(--gold)" stroke-width="0.7" opacity="0.45">
			<line x1="0" y1="50" x2="100" y2="50" />
			<line x1="50" y1="0" x2="50" y2="100" />
		</g>

		{#each blips as b (b.id)}
			<rect
				x={b.x - 2}
				y={b.y - 2}
				width="4"
				height="4"
				fill={b.visited ? 'var(--mint)' : 'var(--tim-red)'}
			/>
		{/each}

		<!-- Where the map is centred. -->
		<rect x="48.5" y="48.5" width="3" height="3" fill="var(--gold)" />
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
			shape-rendering: crispEdges;
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

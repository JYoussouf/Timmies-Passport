<script lang="ts">
	/**
	 * The compass: a circular radar dial with the map controls set into its rim.
	 *
	 * The dial plots the Timmies around wherever you are looking - red for
	 * unstamped, green for collected - so it answers "what is near me" rather
	 * than repeating what the map already shows. Zoom sits north and south,
	 * the view controls east and west.
	 *
	 * Shown at every size: on a phone it replaces a stack of loose buttons with
	 * one object that costs no more room than they did.
	 */
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';

	let {
		center,
		locating,
		onlocate,
		onglobal,
		onzoomin,
		onzoomout
	}: {
		center: { lng: number; lat: number; zoom: number };
		locating: boolean;
		onlocate: () => void;
		onglobal: () => void;
		onzoomin: () => void;
		onzoomout: () => void;
	} = $props();

	/** Half-width of the dial in degrees of longitude, tied to map zoom. */
	const span = $derived(Math.min(120, 180 / Math.pow(2, Math.max(0, center.zoom - 1))));

	/** Blips inside the dial, in a 0-100 viewBox. Latitude is inverted: north is up. */
	const blips = $derived(
		locations
			.sampleAround(center.lng, center.lat, span)
			.map((l) => ({
				id: l.id,
				x: 50 + ((l.lng - center.lng) / span) * 50,
				y: 50 - ((l.lat - center.lat) / span) * 50,
				visited: passport.isVisited(l.id)
			}))
			// A round dial should not show square corners of data.
			.filter((b) => Math.hypot(b.x - 50, b.y - 50) <= 45)
	);

	const hemi = $derived({
		lat: `${Math.abs(center.lat).toFixed(1)}${center.lat >= 0 ? 'N' : 'S'}`,
		lng: `${Math.abs(center.lng).toFixed(1)}${center.lng >= 0 ? 'E' : 'W'}`
	});
</script>

<div class="compass">
	<div class="dial">
		<svg viewBox="0 0 100 100" role="img" aria-label="{blips.length} Tim Hortons near this view">
			<circle cx="50" cy="50" r="50" fill="var(--screen-deep)" />

			<g stroke="rgba(247,239,227,0.13)" stroke-width="0.7" fill="none">
				<circle cx="50" cy="50" r="32" />
				<circle cx="50" cy="50" r="16" />
			</g>
			<g stroke="var(--gold)" stroke-width="0.7" opacity="0.4">
				<line x1="5" y1="50" x2="95" y2="50" />
				<line x1="50" y1="5" x2="50" y2="95" />
			</g>

			<!-- Bearing ticks between the four buttons. -->
			<g stroke="rgba(247,239,227,0.3)" stroke-width="1.4" stroke-linecap="butt">
				{#each [45, 135, 225, 315] as deg (deg)}
					<line
						x1={50 + 44 * Math.cos((deg * Math.PI) / 180)}
						y1={50 + 44 * Math.sin((deg * Math.PI) / 180)}
						x2={50 + 49 * Math.cos((deg * Math.PI) / 180)}
						y2={50 + 49 * Math.sin((deg * Math.PI) / 180)}
					/>
				{/each}
			</g>

			{#each blips as b (b.id)}
				<rect
					x={b.x - 2}
					y={b.y - 2}
					width="4"
					height="4"
					fill={b.visited ? 'var(--green)' : 'var(--tim-red)'}
				/>
			{/each}

			<rect x="48.5" y="48.5" width="3" height="3" fill="var(--gold)" />
		</svg>

		<span class="coords pixel">{hemi.lat} {hemi.lng}</span>
	</div>

	<button class="btn up" aria-label="Zoom in" title="Zoom in" onclick={onzoomin}>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" />
		</svg>
	</button>

	<button class="btn down" aria-label="Zoom out" title="Zoom out" onclick={onzoomout}>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<path d="M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" />
		</svg>
	</button>

	<button class="btn west" aria-label="Zoom out to the whole world" title="Whole world" onclick={onglobal}>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
			<ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="2" />
			<path d="M3 12h18" stroke="currentColor" stroke-width="2" />
		</svg>
	</button>

	<button
		class="btn east"
		class:on={locating}
		aria-pressed={locating}
		aria-label={locating ? 'Stop following my location' : 'Follow my location'}
		title={locating ? 'Stop following my location' : 'Follow my location'}
		onclick={onlocate}
	>
		<svg viewBox="0 0 24 24" aria-hidden="true">
			<circle cx="12" cy="12" r="4" fill="currentColor" />
			<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" />
			<path
				d="M12 1v3M12 20v3M1 12h3M20 12h3"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="square"
			/>
		</svg>
	</button>
</div>

<style>
	/*
	 * One square box holds the dial inset by half a button, so a button centred
	 * on any edge lands exactly on the dial's rim.
	 */
	.compass {
		--dial: 104px;
		--btn: 36px;
		position: relative;
		flex: none;
		width: calc(var(--dial) + var(--btn));
		height: calc(var(--dial) + var(--btn));
	}

	@media (min-width: 900px) {
		.compass {
			--dial: 124px;
			--btn: 40px;
		}
	}

	.dial {
		position: absolute;
		inset: calc(var(--btn) / 2);
		border-radius: 50%;
		background: var(--screen-deep);
		box-shadow:
			0 0 0 3px var(--cabinet),
			0 0 0 5px var(--cabinet-lo),
			inset 0 0 0 2px rgba(247, 239, 227, 0.08);
		overflow: hidden;
	}
	.dial svg {
		display: block;
		width: 100%;
		height: 100%;
		shape-rendering: crispEdges;
	}
	.coords {
		position: absolute;
		left: 0;
		right: 0;
		/* Clear of the southern button, which overlaps the rim. */
		bottom: 24%;
		text-align: center;
		font-size: 0.38rem;
		color: var(--gold);
		/* Blips sit behind it, so the readout carries its own backing. */
		text-shadow:
			0 0 3px var(--screen-deep),
			0 0 3px var(--screen-deep),
			0 0 3px var(--screen-deep);
		pointer-events: none;
	}

	/* Round buttons keep their bevel as stacked rings, since a border-radius
	   and a hard four-sided bevel cannot coexist. */
	.btn {
		position: absolute;
		display: grid;
		place-items: center;
		width: var(--btn);
		height: var(--btn);
		border-radius: 50%;
		color: var(--cream);
		background: var(--cabinet);
		box-shadow:
			inset 0 2px 0 var(--cabinet-hi),
			0 0 0 2px var(--cabinet-lo),
			0 3px 0 var(--cabinet-lo);
		transition: background 0.12s linear;
	}
	.btn svg {
		width: 55%;
		height: 55%;
	}
	.btn:hover {
		background: var(--cabinet-hi);
	}
	.btn:active {
		transform: translateY(3px);
		box-shadow:
			inset 0 2px 0 var(--cabinet-hi),
			0 0 0 2px var(--cabinet-lo);
	}
	.btn.on {
		background: var(--green);
		color: #04150f;
		box-shadow:
			inset 0 2px 0 #7cf08d,
			0 0 0 2px var(--green-deep),
			0 3px 0 var(--green-deep);
	}

	.up {
		top: 0;
		left: 50%;
		margin-left: calc(var(--btn) / -2);
	}
	.down {
		bottom: 0;
		left: 50%;
		margin-left: calc(var(--btn) / -2);
	}
	.west {
		left: 0;
		top: 50%;
		margin-top: calc(var(--btn) / -2);
	}
	.east {
		right: 0;
		top: 50%;
		margin-top: calc(var(--btn) / -2);
	}
	/* The press shifts down, so the side buttons need their offset preserved. */
	.west:active,
	.east:active {
		transform: translateY(3px);
	}
</style>

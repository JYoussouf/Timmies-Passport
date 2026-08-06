<script lang="ts">
	/**
	 * The map pad: zoom in on top, the two view buttons beneath it, zoom out
	 * below. Replaces MapLibre's own NavigationControl so all four sit in one
	 * cluster instead of two competing corners.
	 */
	let {
		locating,
		onlocate,
		onglobal,
		onzoomin,
		onzoomout
	}: {
		locating: boolean;
		onlocate: () => void;
		onglobal: () => void;
		onzoomin: () => void;
		onzoomout: () => void;
	} = $props();
</script>

<div class="pad">
	<button class="ctl wide" aria-label="Zoom in" title="Zoom in" onclick={onzoomin}>
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" />
		</svg>
	</button>

	<button class="ctl" aria-label="Zoom out to the whole world" title="Whole world" onclick={onglobal}>
		<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
			<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
			<ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="2" />
			<path d="M3 12h18" stroke="currentColor" stroke-width="2" />
		</svg>
	</button>

	<button
		class="ctl"
		class:on={locating}
		aria-pressed={locating}
		aria-label={locating ? 'Stop following my location' : 'Follow my location'}
		title={locating ? 'Stop following my location' : 'Follow my location'}
		onclick={onlocate}
	>
		<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
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

	<button class="ctl wide" aria-label="Zoom out" title="Zoom out" onclick={onzoomout}>
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<path d="M5 12h14" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" />
		</svg>
	</button>
</div>

<style>
	.pad {
		display: grid;
		grid-template-columns: repeat(2, 44px);
		gap: 6px;
	}
	/*
	 * Zoom spans both columns but stays button-sized and centred, so the four
	 * controls read as a cross rather than an L.
	 */
	.wide {
		grid-column: 1 / -1;
		justify-self: center;
	}
	.ctl {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		color: var(--cream);
		background: var(--cabinet);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md);
		transition: background 0.12s linear;
	}
	.ctl:hover {
		background: var(--cabinet-hi);
	}
	.ctl:active {
		transform: translate(3px, 3px);
		box-shadow: none;
	}
	.ctl.on {
		background: var(--mint);
		color: #04150f;
		border-top-color: #6fd3b5;
		border-left-color: #6fd3b5;
		border-right-color: var(--mint-deep);
		border-bottom-color: var(--mint-deep);
	}
</style>

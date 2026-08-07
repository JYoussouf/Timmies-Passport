<script lang="ts">
	import Cabinet from '$lib/components/Cabinet.svelte';
	import { APP_NAME, TAGLINE } from '$lib/brand';
	import MapView from '$lib/components/MapView.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import LocationSheet from '$lib/components/LocationSheet.svelte';
	import SearchDock, { type Pick } from '$lib/components/SearchDock.svelte';
	import StoreStepper from '$lib/components/StoreStepper.svelte';
	import Compass from '$lib/components/Compass.svelte';
	import Legend from '$lib/components/Legend.svelte';
	import ZoomHint from '$lib/components/ZoomHint.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { HOME_CENTER } from '$lib/map/style';
	import { ui } from '$lib/stores/ui.svelte';

	let mapView: MapView;
	let locating = $state(false);
	let center = $state({ lng: HOME_CENTER[0], lat: HOME_CENTER[1], zoom: 3 });
	/* Not persisted: every arrival gets the hint, not just a first ever one. */
	let hasZoomed = $state(false);

	function goTo(p: Pick) {
		if (p.kind === 'place') {
			mapView?.fitBounds(p.bounds);
			return;
		}
		if (p.kind === 'point') {
			// A place with no stores: drop in at town scale so the surrounding
			// area, and anything just outside it, is visible.
			mapView?.flyTo(p.center, 11);
			return;
		}
		ui.select(p.id);
		const c = locations.coordsOf(p.id);
		if (c) mapView?.flyTo(c);
	}

	async function toggleLocate() {
		if (locating) {
			mapView?.stopLocating();
			locating = false;
			return;
		}
		locating = true;
		const ok = await mapView.startLocating();
		locating = ok;
		if (!ok) {
			ui.toast({
				emoji: '📍',
				title: 'No location',
				body: 'Allow location access in your browser to follow along.'
			});
		}
	}
</script>

<svelte:head>
	<title>{APP_NAME} - {TAGLINE}</title>
</svelte:head>

<Cabinet>
	<MapView
		bind:this={mapView}
		onmove={(c) => (center = c)}
		onzoomed={() => (hasZoomed = true)}
	/>
	<TopBar />

	<Legend />

	<StoreStepper
		onstep={(id: string) => {
			ui.select(id);
			const c = locations.coordsOf(id);
			if (c) mapView?.stepTo(c);
		}}
	/>

	<!--
		The card lives inside the cabinet, not beside it. `position: fixed` makes
		the cabinet a stacking context, so anything outside it wins against
		everything inside it regardless of z-index, and the card would sit over
		the stepper's arrows however they were stacked. Same context, and the
		two order normally again.
	-->
	<LocationSheet />

	<!--
		Clicking the selected cup again zooms the rest of the way in. The cup is
		centred, and the card is docked over that centre, so the cup itself
		cannot receive the click - this sits above the card, exactly where the
		cup is, and stands in for it. It exists only while there is still a
		closer step to take, so it never eats a click it has no answer for.
	-->
	{#if ui.selectedId && center.zoom < 16.9}
		<button
			class="closer"
			aria-label="Zoom in closer"
			title="Zoom in closer"
			onclick={() => {
				const c = locations.coordsOf(ui.selectedId!);
				if (c) mapView?.goCloser(c);
			}}
		></button>
	{/if}

	<!--
		Everything along the bottom stacks in one dock, so nothing above has to
		hard-code the height of anything below it.
	-->
	<div class="bottom-dock">
		<div class="dock-left"><ZoomHint done={hasZoomed} /></div>

		<div class="rail">
			<SearchDock onpick={goTo} {center} />
			<div class="dock-right">
				<Compass
					{center}
					{locating}
					onlocate={toggleLocate}
					onglobal={() => {
				ui.select(null);
				mapView?.resetView();
			}}
					onzoomin={() => mapView?.zoomIn()}
					onzoomout={() => mapView?.zoomOut()}
				/>
			</div>
		</div>
		<BottomNav />
	</div>
</Cabinet>

<style>
	/*
	 * Invisible, and deliberately cup-sized rather than larger: it stands in
	 * for the cup underneath, so it should not claim ground the cup does not.
	 * Above the card (41) and below the stepper's arrows (42), which ring it.
	 */
	/* Fixed for the same reason as the stepper's ring: --map-cx/cy are
	   viewport coordinates. */
	.closer {
		position: fixed;
		left: var(--map-cx, 50%);
		top: var(--map-cy, 50%);
		width: 44px;
		height: 44px;
		margin: -22px;
		z-index: 41;
		background: none;
		border: none;
		cursor: zoom-in;
	}

	.bottom-dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 30;
		display: flex;
		flex-direction: column;
		padding-bottom: var(--safe-bottom);
	}

	/*
	 * Mobile dissolves the rail so the search bar takes its own place in the
	 * stack.
	 */
	.rail {
		display: contents;
	}

	/*
	 * The compass floats in the corner above the dock rather than taking a row
	 * in it. As a row it was full-width, and the empty half beside it was a
	 * strip of screen that looked like map but swallowed every drag. Out of
	 * flow it is only as big as itself, and the map gets the height back.
	 */
	.dock-right,
	.dock-left {
		position: absolute;
		bottom: 100%;
		margin-bottom: 8px;
		z-index: 22;
	}
	.dock-right {
		right: 10px;
	}
	/* Opposite corner from the compass, at the same height. */
	.dock-left {
		left: 10px;
		pointer-events: none;
	}

	@media (min-width: 900px) {
		/*
		 * Desktop puts them on one line. The compass is absolute inside the rail
		 * so it can be taller than the search bar without pushing it up the
		 * screen or stealing the centring.
		 */
		.rail {
			order: 1;
			position: relative;
			display: flex;
			justify-content: center;
			align-items: flex-end;
		}
		.dock-right {
			/* The dock is fixed to the window, so clearing the cabinet frame and
			   its border keeps the compass inside the screen. */
			right: calc(var(--frame) + 10px);
			bottom: 8px;
			margin: 0;
		}
		.dock-left {
			left: calc(var(--frame) + 10px);
		}
	}
</style>

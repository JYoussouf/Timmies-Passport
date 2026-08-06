<script lang="ts">
	import Cabinet from '$lib/components/Cabinet.svelte';
	import MapView from '$lib/components/MapView.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import LocationSheet from '$lib/components/LocationSheet.svelte';
	import SearchDock, { type Pick } from '$lib/components/SearchDock.svelte';
	import Compass from '$lib/components/Compass.svelte';
	import Legend from '$lib/components/Legend.svelte';
	import Marquee from '$lib/components/Marquee.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { HOME_CENTER } from '$lib/map/style';
	import { ui } from '$lib/stores/ui.svelte';

	let mapView: MapView;
	let locating = $state(false);
	let center = $state({ lng: HOME_CENTER[0], lat: HOME_CENTER[1], zoom: 3 });

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
	<title>Timmies Passport - collect every Tim Hortons</title>
</svelte:head>

<Cabinet>
	<MapView bind:this={mapView} onmove={(c) => (center = c)} />
	<TopBar />

	<Legend />

	<!--
		Everything along the bottom stacks in one dock, so nothing above has to
		hard-code the height of anything below it.
	-->
	<div class="bottom-dock">
		<div class="rail">
			<SearchDock onpick={goTo} />
			<div class="dock-right">
				<Compass
					{center}
					{locating}
					onlocate={toggleLocate}
					onglobal={() => mapView?.resetView()}
					onzoomin={() => mapView?.zoomIn()}
					onzoomout={() => mapView?.zoomOut()}
				/>
			</div>
		</div>
		<Marquee />
		<BottomNav />
	</div>
</Cabinet>

<LocationSheet />

<style>
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
	 * Mobile keeps the compass and the search bar as separate rows in the stack,
	 * so the rail dissolves and each takes its own order.
	 */
	.rail {
		display: contents;
	}

	.dock-right {
		order: 1;
		align-self: flex-end;
		margin: 0 10px 8px;
		z-index: 22;
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
			position: absolute;
			/* The dock is fixed to the window, so clearing the cabinet frame and
			   its border keeps the compass inside the screen. */
			right: calc(var(--frame) + 10px);
			bottom: 8px;
			margin: 0;
		}
	}
</style>

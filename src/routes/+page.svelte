<script lang="ts">
	import Cabinet from '$lib/components/Cabinet.svelte';
	import MapView from '$lib/components/MapView.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import LocationSheet from '$lib/components/LocationSheet.svelte';
	import SearchDock, { type Pick } from '$lib/components/SearchDock.svelte';
	import MapControls from '$lib/components/MapControls.svelte';
	import Legend from '$lib/components/Legend.svelte';
	import Radar from '$lib/components/Radar.svelte';
	import Marquee from '$lib/components/Marquee.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { INITIAL_VIEW } from '$lib/map/style';
	import { ui } from '$lib/stores/ui.svelte';

	let mapView: MapView;
	let locating = $state(false);
	let center = $state({
		lng: INITIAL_VIEW.center[0],
		lat: INITIAL_VIEW.center[1],
		zoom: INITIAL_VIEW.zoom
	});

	function goTo(p: Pick) {
		if (p.kind === 'place') {
			mapView?.fitBounds(p.bounds);
			return;
		}
		const c = locations.coordsOf(p.id);
		if (c) mapView?.flyTo(c);
		ui.select(p.id);
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
				<MapControls
					{locating}
					onlocate={toggleLocate}
					onglobal={() => mapView?.resetView()}
					onzoomin={() => mapView?.zoomIn()}
					onzoomout={() => mapView?.zoomOut()}
				/>
				<Radar {center} />
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
	 * Mobile keeps search and the console as separate rows in the stack, so the
	 * rail dissolves and each takes its own order.
	 */
	.rail {
		display: contents;
	}

	.dock-right {
		order: 1;
		align-self: flex-end;
		z-index: 22;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	@media (min-width: 900px) {
		/*
		 * Desktop puts them on one line, both sitting on the ticker. The console
		 * is absolute inside the rail so it can be far taller than the search bar
		 * without pushing it up the screen or stealing the centring.
		 */
		.rail {
			order: 1;
			position: relative;
			display: flex;
			justify-content: center;
			align-items: flex-end;
		}
		/*
		 * Flush into the cabinet's right rail. The two edges that meet something
		 * carry no border and no bevel shadow, so the console reads as part of
		 * the frame rather than a plate parked against it; the top and left keep
		 * their highlight so it still reads as raised.
		 */
		.dock-right {
			position: absolute;
			/* The dock is fixed to the window, so meeting the cabinet's inner
			   edge means clearing the frame and its 2px border. */
			right: calc(var(--frame) + 2px);
			bottom: 0;
			gap: 8px;
			padding: 8px;
			background: var(--cabinet);
			border-top: 2px solid var(--cabinet-hi);
			border-left: 2px solid var(--cabinet-hi);
			border-right: none;
			border-bottom: none;
			box-shadow: none;
		}
	}
</style>

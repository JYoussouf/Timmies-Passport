<script lang="ts">
	import Cabinet from '$lib/components/Cabinet.svelte';
	import MapView from '$lib/components/MapView.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import LocationSheet from '$lib/components/LocationSheet.svelte';
	import SearchDock from '$lib/components/SearchDock.svelte';
	import MapControls from '$lib/components/MapControls.svelte';
	import SupportMenu from '$lib/components/SupportMenu.svelte';
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

	function goTo(id: string) {
		const c = locations.coordsOf(id);
		if (c) mapView?.flyTo(c);
		ui.select(id);
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

	<Radar {center} />

	<!--
		Everything along the bottom stacks in one dock, so nothing above has to
		hard-code the height of anything below it. The side controls hang off the
		dock's top edge, which keeps them clear however tall it grows.
	-->
	<div class="bottom-dock">
		<div class="dock-left"><SupportMenu /></div>
		<div class="dock-right">
			<MapControls
				{locating}
				onlocate={toggleLocate}
				onglobal={() => mapView?.resetView()}
				onzoomin={() => mapView?.zoomIn()}
				onzoomout={() => mapView?.zoomOut()}
			/>
		</div>
		<Marquee />
		<SearchDock onpick={goTo} />
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
		padding-bottom: var(--safe-bottom);
	}
	.dock-left,
	.dock-right {
		position: absolute;
		bottom: calc(100% + 10px);
		z-index: 22;
	}
	.dock-left {
		left: 10px;
	}
	.dock-right {
		right: 10px;
	}

	@media (min-width: 900px) {
		.dock-left {
			left: 14px;
		}
		.dock-right {
			right: 14px;
			/* Clears the radar plate, which owns this corner. */
			bottom: calc(100% + 165px);
		}
	}
	@media (min-width: 900px) and (max-height: 620px) {
		.dock-right {
			bottom: calc(100% + 10px);
		}
	}
</style>

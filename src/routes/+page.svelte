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
		if (c) mapView?.flyTo(c, 15);
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
	<div class="dock-left">
		<SupportMenu />
		<MapControls {locating} onlocate={toggleLocate} onglobal={() => mapView?.resetView()} />
	</div>
	<SearchDock onpick={goTo} />
	<Marquee />
</Cabinet>

<LocationSheet />
<BottomNav />

<style>
	.dock-left {
		position: absolute;
		left: 10px;
		/* Clears the ticker, the search dock and the tab bar stacked below. */
		bottom: calc(var(--safe-bottom) + 141px);
		z-index: 22;
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
	}

	@media (min-width: 900px) {
		.dock-left {
			left: 14px;
			bottom: 46px;
		}
	}
</style>

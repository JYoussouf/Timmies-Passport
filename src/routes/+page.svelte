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
		hard-code the height of anything below it. The side controls hang off the
		dock's top edge, which keeps them clear however tall it grows.
	-->
	<div class="bottom-dock">
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
		display: flex;
		flex-direction: column;
		padding-bottom: var(--safe-bottom);
	}

	/*
	 * A row in the stack rather than something floating above it, so the console
	 * sits flush on the ticker however tall the rows below it grow. The pad and
	 * radar travel together inside it, so neither needs the other's height.
	 *
	 * Mobile puts it at the top of the stack; desktop slots it beneath the
	 * search island, which is centred and leaves this corner free.
	 */
	.dock-right {
		order: 1;
		align-self: flex-end;
		margin-right: 10px;
		z-index: 22;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	/* On desktop the pad and radar share one bevelled console. */
	@media (min-width: 900px) {
		.dock-right {
			order: 2;
			margin-right: 14px;
			gap: 8px;
			padding: 8px;
			background: var(--cabinet);
			border-top: 2px solid var(--cabinet-hi);
			border-left: 2px solid var(--cabinet-hi);
			border-right: 2px solid var(--cabinet-lo);
			border-bottom: 2px solid var(--cabinet-lo);
			box-shadow: var(--bevel-md);
		}
	}
</style>

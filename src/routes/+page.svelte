<script lang="ts">
	import Cabinet from '$lib/components/Cabinet.svelte';
	import MapView from '$lib/components/MapView.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import LocationSheet from '$lib/components/LocationSheet.svelte';
	import SearchOverlay from '$lib/components/SearchOverlay.svelte';
	import Hud from '$lib/components/Hud.svelte';
	import Legend from '$lib/components/Legend.svelte';
	import Radar from '$lib/components/Radar.svelte';
	import Marquee from '$lib/components/Marquee.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { INITIAL_VIEW } from '$lib/map/style';
	import { ui } from '$lib/stores/ui.svelte';

	let mapView: MapView;
	let searchOpen = $state(false);
	let center = $state({ lng: INITIAL_VIEW.center[0], lat: INITIAL_VIEW.center[1] });

	function goTo(id: string) {
		const c = locations.coordsOf(id);
		if (c) mapView?.flyTo(c, 15);
		ui.select(id);
	}
</script>

<svelte:head>
	<title>Timmies Passport — collect every Tim Hortons</title>
</svelte:head>

<Cabinet>
	<MapView bind:this={mapView} onmove={(c) => (center = { lng: c.lng, lat: c.lat })} />
	<TopBar onsearch={() => (searchOpen = true)} />

	<!--
		Mobile shows only the count plate here, centred under the top bar.
		On desktop `display: contents` dissolves the row so each piece takes
		its own place on the cabinet: count centred, legend on the left rail.
	-->
	<div class="strip">
		<Hud />
		<Legend />
	</div>

	<Radar {center} />
	<Marquee />
</Cabinet>

<SearchOverlay bind:open={searchOpen} onpick={goTo} />
<LocationSheet />
<BottomNav />

<style>
	.strip {
		position: absolute;
		top: calc(var(--safe-top) + 68px);
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: 0 10px;
		pointer-events: none;
	}

	@media (min-width: 900px) {
		.strip {
			display: contents;
		}
	}
</style>

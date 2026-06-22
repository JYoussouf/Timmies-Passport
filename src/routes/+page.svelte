<script lang="ts">
	import MapView from '$lib/components/MapView.svelte';
	import TopBar from '$lib/components/TopBar.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import LocationSheet from '$lib/components/LocationSheet.svelte';
	import SearchOverlay from '$lib/components/SearchOverlay.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { ui } from '$lib/stores/ui.svelte';

	let mapView: MapView;
	let searchOpen = $state(false);

	function goTo(id: string) {
		const c = locations.coords.get(id);
		if (c) mapView?.flyTo(c, 15);
		ui.select(id);
	}
</script>

<svelte:head>
	<title>Timmies Passport — collect every Tim Hortons</title>
</svelte:head>

<main class="screen">
	<MapView bind:this={mapView} />
	<TopBar onsearch={() => (searchOpen = true)} />
	<SearchOverlay bind:open={searchOpen} onpick={goTo} />
	<LocationSheet />
	<BottomNav />
</main>

<style>
	.screen {
		position: fixed;
		inset: 0;
		overflow: hidden;
	}
</style>

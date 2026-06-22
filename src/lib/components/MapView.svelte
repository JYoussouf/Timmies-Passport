<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { BASEMAP_STYLE, INITIAL_VIEW } from '$lib/map/style';
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { haptic } from '$lib/effects';

	let container: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let ready = $state(false);

	const SRC = 'timmies';

	function buildData(): GeoJSON.FeatureCollection {
		const feats = (locations.collection?.features ?? []).map((f) => ({
			...f,
			properties: { ...f.properties, visited: passport.isVisited(f.properties.id) ? 1 : 0 }
		}));
		return { type: 'FeatureCollection', features: feats as GeoJSON.Feature[] };
	}

	function refreshData() {
		const src = map?.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
		if (src) src.setData(buildData());
	}

	function addLayers() {
		if (!map) return;
		map.addSource(SRC, {
			type: 'geojson',
			data: buildData(),
			cluster: true,
			clusterRadius: 52,
			clusterMaxZoom: 12
		});

		// Cluster bubbles — espresso, sized by count
		map.addLayer({
			id: 'clusters',
			type: 'circle',
			source: SRC,
			filter: ['has', 'point_count'],
			paint: {
				'circle-color': '#3d2820',
				'circle-radius': ['step', ['get', 'point_count'], 18, 25, 24, 100, 30, 750, 38],
				'circle-stroke-width': 3,
				'circle-stroke-color': 'rgba(247,239,227,0.85)'
			}
		});
		map.addLayer({
			id: 'cluster-count',
			type: 'symbol',
			source: SRC,
			filter: ['has', 'point_count'],
			layout: {
				'text-field': ['get', 'point_count_abbreviated'],
				'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
				'text-size': 13
			},
			paint: { 'text-color': '#f7efe3' }
		});

		// Unvisited single points — hollow coffee dots
		map.addLayer({
			id: 'pins',
			type: 'circle',
			source: SRC,
			filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'visited'], 0]],
			paint: {
				'circle-color': '#fffaf2',
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 4, 12, 7],
				'circle-stroke-width': 2.5,
				'circle-stroke-color': '#b07a4f'
			}
		});

		// Visited single points — filled Tim's red with a warm glow
		map.addLayer({
			id: 'pins-visited',
			type: 'circle',
			source: SRC,
			filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'visited'], 1]],
			paint: {
				'circle-color': '#d8232a',
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 6, 12, 10],
				'circle-stroke-width': 3,
				'circle-stroke-color': '#fffaf2'
			}
		});

		// Selected ring
		map.addLayer({
			id: 'selected-ring',
			type: 'circle',
			source: SRC,
			filter: ['==', ['get', 'id'], '__none__'],
			paint: {
				'circle-color': 'rgba(216,35,42,0.12)',
				'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 14, 12, 22],
				'circle-stroke-width': 2,
				'circle-stroke-color': '#d8232a'
			}
		});

		// Interactions
		map.on('click', 'clusters', (e) => {
			const f = map!.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
			const clusterId = f.properties!.cluster_id;
			(map!.getSource(SRC) as maplibregl.GeoJSONSource)
				.getClusterExpansionZoom(clusterId)
				.then((zoom) => {
					map!.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom });
				});
		});

		for (const layer of ['pins', 'pins-visited']) {
			map.on('click', layer, (e) => {
				const f = e.features?.[0];
				if (!f) return;
				haptic(8);
				const id = f.properties!.id as string;
				ui.select(id);
				map!.easeTo({
					center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
					offset: [0, -120],
					duration: 600
				});
			});
			map.on('mouseenter', layer, () => (map!.getCanvas().style.cursor = 'pointer'));
			map.on('mouseleave', layer, () => (map!.getCanvas().style.cursor = ''));
		}
		map.on('mouseenter', 'clusters', () => (map!.getCanvas().style.cursor = 'pointer'));
		map.on('mouseleave', 'clusters', () => (map!.getCanvas().style.cursor = ''));

		ready = true;
	}

	export function flyTo(center: [number, number], zoom = 14) {
		map?.flyTo({ center, zoom, offset: [0, -120], duration: 1400 });
	}

	onMount(() => {
		map = new maplibregl.Map({
			container,
			style: BASEMAP_STYLE,
			center: INITIAL_VIEW.center,
			zoom: INITIAL_VIEW.zoom,
			attributionControl: { compact: true },
			maxZoom: 18
		});

		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
		map.addControl(
			new maplibregl.GeolocateControl({
				positionOptions: { enableHighAccuracy: true },
				trackUserLocation: true
			}),
			'bottom-right'
		);

		map.on('load', async () => {
			await locations.load();
			addLayers();
		});

		return () => map?.remove();
	});

	// Re-paint pins whenever the user's collection changes
	$effect(() => {
		// touch reactive deps
		void passport.count;
		if (ready) refreshData();
	});

	// Highlight the selected location
	$effect(() => {
		const id = ui.selectedId;
		if (ready && map?.getLayer('selected-ring')) {
			map.setFilter('selected-ring', ['==', ['get', 'id'], id ?? '__none__']);
		}
	});
</script>

<div class="map" bind:this={container} aria-label="Map of Tim Hortons locations"></div>

{#if locations.loading || !ready}
	<div class="loading" role="status">
		<span class="spinner" aria-hidden="true"></span>
		Brewing the map…
	</div>
{/if}

<style>
	.map {
		position: absolute;
		inset: 0;
		background: #f3ece0;
	}
	.loading {
		position: absolute;
		top: calc(50% - 1rem);
		left: 50%;
		transform: translate(-50%, -50%);
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-weight: 600;
		color: var(--ink-soft);
		background: var(--surface);
		padding: 0.7rem 1.1rem;
		border-radius: 999px;
		box-shadow: var(--shadow-md);
		pointer-events: none;
	}
	.spinner {
		width: 16px;
		height: 16px;
		border: 2.5px solid var(--cream-deep);
		border-top-color: var(--accent);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	/* Tame MapLibre's default controls into the brand */
	:global(.maplibregl-ctrl-group) {
		border-radius: 14px !important;
		box-shadow: var(--shadow-md) !important;
		overflow: hidden;
	}
	:global(.maplibregl-ctrl-bottom-right) {
		margin-bottom: calc(var(--safe-bottom) + 92px);
		margin-right: 12px;
	}
</style>

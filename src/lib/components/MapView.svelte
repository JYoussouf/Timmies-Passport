<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import {
		trackerStyle,
		HOME_BOUNDS,
		HOME_PADDING,
		MAP_COLORS
	} from '$lib/map/style';
	import { registerSprites } from '$lib/map/sprites';
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { haptic } from '$lib/effects';

	let { onmove }: { onmove?: (c: { lng: number; lat: number; zoom: number }) => void } = $props();

	let container: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let ready = $state(false);

	const SRC = 'timmies';
	const COUNT_FONT = ['Montserrat Bold', 'Open Sans Bold'];
	/** Never overshoot a cluster tap past street level. */
	const CLUSTER_ZOOM_CAP = 16;

	function buildData(): GeoJSON.FeatureCollection {
		const feats = (locations.collection?.features ?? [])
			.map((f) => ({
				...f,
				properties: {
					...f.properties,
					visited: passport.isVisited(f.properties.id) ? 1 : 0,
					closed: f.properties.closed ? 1 : 0
				}
			}))
			/*
			 * Filtered out of the source rather than hidden at the layer, so the
			 * cluster counts agree with what is drawn. A closure already in the
			 * passport always stays: it is part of a collection.
			 */
			.filter((f) => settings.showClosed || !f.properties.closed || f.properties.visited);
		return { type: 'FeatureCollection', features: feats as GeoJSON.Feature[] };
	}

	function refreshData() {
		const src = map?.getSource(SRC) as maplibregl.GeoJSONSource | undefined;
		if (src) src.setData(buildData());
	}

	function addLayers() {
		if (!map) return;
		registerSprites(map);

		map.addSource(SRC, {
			type: 'geojson',
			data: buildData(),
			cluster: true,
			// A tighter radius and a lower ceiling mean individual cups appear
			// much earlier: past zoom 9 you are looking at stores, not tallies.
			clusterRadius: 38,
			clusterMaxZoom: 9
		});

		// Clusters are the same cup, scaled up with the count printed on the
		// body. One shape at every zoom: a cup with a number becomes a plain cup
		// once you are close enough for the stores to separate.
		map.addLayer({
			id: 'clusters',
			type: 'symbol',
			source: SRC,
			filter: ['has', 'point_count'],
			layout: {
				'icon-image': 'pin-unstamped',
				// The body is half the sprite's width, so the cup has to be scaled
				// generously for a four-character count like "1.8k" to fit inside it.
				'icon-size': ['step', ['get', 'point_count'], 0.9, 25, 1.3, 150, 1.8],
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
				'text-field': ['get', 'point_count_abbreviated'],
				'text-font': COUNT_FONT,
				'text-size': ['step', ['get', 'point_count'], 10, 25, 12, 150, 13],
				// The cup body sits slightly below centre, so the count follows it.
				'text-offset': [0, 0.3],
				'text-allow-overlap': true,
				'text-ignore-placement': true
			},
			paint: { 'text-color': MAP_COLORS.cabinet }
		});

		// Unstamped - red cups.
		map.addLayer({
			id: 'pins',
			type: 'symbol',
			source: SRC,
			filter: [
				'all',
				['!', ['has', 'point_count']],
				['==', ['get', 'visited'], 0],
				['!=', ['get', 'closed'], 1]
			],
			layout: {
				'icon-image': 'pin-unstamped',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
				// Flat on the way in: a lone cup has to be findable on a
				// province-wide view, and by street level the building around it
				// has grown far faster, so the cup settles to storefront scale.
				'icon-size': [
					'interpolate',
					['linear'],
					['zoom'],
					3, 0.85, 8, 0.95, 13, 1.1, 17, 1.35, 20, 1.5
				]
			}
		});

		// Stamped - green cups. Drawn above the unstamped ones so a collected
		// store always wins an overlap.
		map.addLayer({
			id: 'pins-visited',
			type: 'symbol',
			source: SRC,
			filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'visited'], 1]],
			layout: {
				'icon-image': 'pin-stamped',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
				'icon-size': [
					'interpolate',
					['linear'],
					['zoom'],
					3, 0.9, 8, 1, 13, 1.16, 17, 1.42, 20, 1.58
				]
			}
		});

		/*
		 * Closed stores are drawn, not dropped: a passport may already hold one,
		 * and it is useful to know the corner used to have a Timmies. Below the
		 * stamped layer, so a collected closure still shows as collected.
		 */
		map.addLayer({
			id: 'pins-closed',
			type: 'symbol',
			source: SRC,
			filter: [
				'all',
				['!', ['has', 'point_count']],
				['==', ['get', 'visited'], 0],
				['==', ['get', 'closed'], 1]
			],
			layout: {
				'icon-image': 'pin-closed',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
				'icon-size': [
					'interpolate',
					['linear'],
					['zoom'],
					3, 0.85, 8, 0.95, 13, 1.1, 17, 1.35, 20, 1.5
				]
			},
			paint: { 'icon-opacity': 0.85 }
		});

		// Selection reticle.
		map.addLayer({
			id: 'selected-ring',
			type: 'symbol',
			source: SRC,
			filter: ['==', ['get', 'id'], '__none__'],
			layout: {
				'icon-image': 'reticle',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
				'icon-size': [
					'interpolate',
					['linear'],
					['zoom'],
					3, 1, 13, 1.3, 17, 1.6, 20, 1.78
				]
			},
			paint: { 'icon-opacity': 1 }
		});

		startReticleBlink();

		// Interactions ------------------------------------------------------
		map.on('click', 'clusters', (e) => {
			const f = map!.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0];
			const clusterId = f.properties!.cluster_id;
			(map!.getSource(SRC) as maplibregl.GeoJSONSource)
				.getClusterExpansionZoom(clusterId)
				.then((expansion) => {
					// The expansion zoom only just splits the cluster, which turns
					// drilling into a city into a long chain of clicks. Overshoot it,
					// and always advance a decent step from wherever we are now.
					const zoom = Math.min(
						CLUSTER_ZOOM_CAP,
						Math.max(expansion + 1.5, map!.getZoom() + 2.5)
					);
					map!.easeTo({
						center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
						zoom,
						duration: 700
					});
				});
		});

		for (const layer of ['pins', 'pins-visited', 'pins-closed']) {
			map.on('click', layer, (e) => {
				const f = e.features?.[0];
				if (!f) return;
				haptic(8);
				const id = f.properties!.id as string;
				ui.select(id);
				/*
				 * The dataset's coordinates, not the clicked feature's.
				 *
				 * MapLibre returns geometry decoded from the vector tile the
				 * feature was rendered from, quantised to that tile's grid. Tap a
				 * cup on a country-wide view and those coordinates are coarse
				 * enough to land hundreds of metres out; tap the same cup again,
				 * now rendered from a zoom-17 tile, and it is exact. That is why
				 * a first tap missed the centre and a second one hit it.
				 */
				focusStore(locations.coordsOf(id) ?? (f.geometry as GeoJSON.Point).coordinates as [number, number]);
			});
			map.on('mouseenter', layer, () => (map!.getCanvas().style.cursor = 'pointer'));
			map.on('mouseleave', layer, () => (map!.getCanvas().style.cursor = ''));
		}
		map.on('mouseenter', 'clusters', () => (map!.getCanvas().style.cursor = 'pointer'));
		map.on('mouseleave', 'clusters', () => (map!.getCanvas().style.cursor = ''));

		ready = true;
	}

	/** Four-frame blink on the selection reticle. Static under reduced motion. */
	let blinkTimer: ReturnType<typeof setInterval> | undefined;
	function startReticleBlink() {
		const reduced =
			typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduced) return;
		const frames = [1, 0.75, 0.35, 0.75];
		let i = 0;
		blinkTimer = setInterval(() => {
			i = (i + 1) % frames.length;
			if (map?.getLayer('selected-ring')) {
				map.setPaintProperty('selected-ring', 'icon-opacity', frames[i]);
			}
		}, 220);
	}

	/**
	 * Zoom close enough to read the intersection a store sits on. The selected
	 * cup lands dead centre, because the check-in card floats directly above it
	 * rather than covering it. Never zooms back out: tapping a store you already
	 * flew to should not undo your zoom.
	 */
	const STREET_ZOOM = 17;

	/**
	 * Selecting a store puts it dead centre.
	 *
	 * An earlier version offset it to sit between the card and the bottom dock,
	 * on the reasoning that the middle of the window is not the middle of the
	 * visible map. That was over-thought: the card is docked under the top bar,
	 * so the true centre is already clear of it, and anywhere else just reads as
	 * off-centre.
	 */
	function focusStore(center: [number, number]) {
		if (!map) return;
		const zoom = Math.max(map.getZoom(), STREET_ZOOM);
		/*
		 * flyTo, not easeTo. Tapping a cup on a country-wide view is a fourteen
		 * level jump, and easeTo interpolates zoom and centre independently, so
		 * it drifts and lands off-target - the reason a first tap missed and a
		 * second, now a short hop, worked. flyTo is built for exactly this.
		 */
		map.flyTo({ center, zoom, duration: 900, essential: true });
	}

	export function flyTo(center: [number, number], zoom = STREET_ZOOM) {
		map?.flyTo({ center, zoom, duration: 1400 });
	}

	/**
	 * Frame a bounding box. Used for a city (capped so a one-store town does not
	 * slam to rooftop zoom) and for the home view.
	 */
	export function fitBounds(
		b: [number, number, number, number],
		padding: number | typeof HOME_PADDING = 70,
		duration = 1100
	) {
		map?.fitBounds(
			[
				[b[0], b[1]],
				[b[2], b[3]]
			],
			{ padding, maxZoom: 14, duration }
		);
	}

	export function zoomIn() {
		map?.easeTo({ zoom: (map?.getZoom() ?? 0) + 1.2, duration: 350 });
	}

	export function zoomOut() {
		map?.easeTo({ zoom: (map?.getZoom() ?? 0) - 1.2, duration: 350 });
	}

	/**
	 * Back to the opening view: the whole of Canada, framed as bounds so it
	 * fills whatever screen it lands on. A fixed zoom showed Canada on a desktop
	 * window and the Great Lakes on a phone.
	 */
	export function resetView() {
		fitBounds(HOME_BOUNDS, HOME_PADDING, 900);
	}

	// --- The user's own position ------------------------------------------
	let userMarker: maplibregl.Marker | undefined;
	let watchId: number | undefined;

	function showUser(lng: number, lat: number) {
		if (!map) return;
		if (!userMarker) {
			const el = document.createElement('div');
			el.className = 'user-dot';
			userMarker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
		} else {
			userMarker.setLngLat([lng, lat]);
		}
	}

	/**
	 * Start following the device's position, flying to it on the first fix.
	 * Resolves false when permission is refused or unavailable.
	 */
	export function startLocating(): Promise<boolean> {
		if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(false);
		return new Promise((resolve) => {
			let first = true;
			watchId = navigator.geolocation.watchPosition(
				({ coords }) => {
					showUser(coords.longitude, coords.latitude);
					if (first) {
						first = false;
						map?.easeTo({ center: [coords.longitude, coords.latitude], zoom: 13, duration: 1200 });
						resolve(true);
					}
				},
				() => {
					stopLocating();
					if (first) {
						first = false;
						resolve(false);
					}
				},
				{ enableHighAccuracy: true, maximumAge: 15_000 }
			);
		});
	}

	export function stopLocating() {
		if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
		watchId = undefined;
		userMarker?.remove();
		userMarker = undefined;
	}

	onMount(() => {
		map = new maplibregl.Map({
			container,
			style: trackerStyle(),
			// Framed from the first paint, so no jump once the data lands.
			bounds: [
				[HOME_BOUNDS[0], HOME_BOUNDS[1]],
				[HOME_BOUNDS[2], HOME_BOUNDS[3]]
			],
			fitBoundsOptions: { padding: HOME_PADDING },
			attributionControl: { compact: true },
			maxZoom: 18
		});

		// A single wheel notch should cover real ground. MapLibre's defaults are
		// slow enough on a mouse that zooming in feels like winching; these rates
		// are roughly 4x the wheel default and 2x the trackpad default.
		map.scrollZoom.setWheelZoomRate(1 / 110);
		map.scrollZoom.setZoomRate(1 / 50);

		// Dev-only handle, for driving the map from a console or a test harness.
		if (import.meta.env.DEV) (window as unknown as { __map?: unknown }).__map = map;


		map.on('load', async () => {
			await locations.load();
			addLayers();
		});

		// Feed the radar. Coalesced to one report per frame so a fast pan does
		// not thrash reactivity.
		let queued = false;
		map.on('move', () => {
			if (queued || !onmove) return;
			queued = true;
			requestAnimationFrame(() => {
				queued = false;
				const c = map!.getCenter();
				onmove!({ lng: c.lng, lat: c.lat, zoom: map!.getZoom() });
			});
		});

		return () => {
			clearInterval(blinkTimer);
			stopLocating();
			map?.remove();
		};
	});

	// Re-paint pins when the collection changes, or closures are toggled
	$effect(() => {
		void passport.count;
		void settings.showClosed;
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
<div class="veil" aria-hidden="true"></div>

{#if locations.loading || !ready}
	<div class="loading pixel" role="status">
		<span class="blocks" aria-hidden="true"><i></i><i></i><i></i></span>
		Brewing the map
	</div>
{/if}

<style>
	.map {
		position: absolute;
		inset: 0;
		background: var(--land);
	}
	.loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		font-size: 0.6rem;
		color: var(--cream);
		background: var(--cabinet);
		padding: 0.9rem 1.1rem;
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md);
		pointer-events: none;
	}
	.blocks {
		display: flex;
		gap: 3px;
	}
	.blocks i {
		width: 6px;
		height: 6px;
		background: var(--gold);
		animation: pop 0.9s steps(2, end) infinite;
	}
	.blocks i:nth-child(2) {
		animation-delay: 0.3s;
	}
	.blocks i:nth-child(3) {
		animation-delay: 0.6s;
	}
	@keyframes pop {
		0%,
		49% {
			opacity: 0.25;
		}
		50%,
		100% {
			opacity: 1;
		}
	}

	/* The device's own position: a green pixel square, pulsing. */
	:global(.user-dot) {
		width: 14px;
		height: 14px;
		background: var(--green);
		box-shadow:
			0 0 0 3px var(--cabinet-lo),
			0 0 0 6px rgba(62, 217, 87, 0.35);
	}
	@media (prefers-reduced-motion: no-preference) {
		:global(.user-dot) {
			animation: ping 1.6s steps(2, end) infinite;
		}
	}
	@keyframes ping {
		50% {
			box-shadow:
				0 0 0 3px var(--cabinet-lo),
				0 0 0 10px rgba(62, 217, 87, 0.18);
		}
	}


	:global(.maplibregl-ctrl-attrib),
	:global(.maplibregl-ctrl-attrib.maplibregl-compact) {
		background: rgba(21, 13, 10, 0.88) !important;
		color: var(--cream-dim) !important;
		border-radius: 0 !important;
		font-size: 10px !important;
		min-height: 0 !important;
	}
	:global(.maplibregl-ctrl-attrib a) {
		color: var(--cream-dim) !important;
	}
	:global(.maplibregl-ctrl-attrib-button) {
		filter: invert(1);
	}
	:global(.maplibregl-ctrl-bottom-left) {
		display: none;
	}
</style>

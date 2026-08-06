<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { trackerStyle, INITIAL_VIEW, MAP_COLORS } from '$lib/map/style';
	import { registerSprites } from '$lib/map/sprites';
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { haptic } from '$lib/effects';

	let { onmove }: { onmove?: (c: { lng: number; lat: number; zoom: number }) => void } = $props();

	let container: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let ready = $state(false);

	const SRC = 'timmies';
	const COUNT_FONT = ['Montserrat Bold', 'Open Sans Bold'];

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
		registerSprites(map);

		map.addSource(SRC, {
			type: 'geojson',
			data: buildData(),
			cluster: true,
			clusterRadius: 52,
			clusterMaxZoom: 12
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
			filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'visited'], 0]],
			layout: {
				'icon-image': 'pin-unstamped',
				'icon-allow-overlap': true,
				'icon-ignore-placement': true,
				'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.28, 8, 0.4, 13, 0.55]
			}
		});

		// Stamped - mint cups. Drawn above the unstamped ones so a collected
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
				'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.32, 8, 0.45, 13, 0.6]
			}
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
				'icon-size': ['interpolate', ['linear'], ['zoom'], 3, 0.4, 13, 0.75]
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
				.then((zoom) => {
					map!.easeTo({
						center: (f.geometry as GeoJSON.Point).coordinates as [number, number],
						zoom
					});
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

	export function flyTo(center: [number, number], zoom = 14) {
		map?.flyTo({ center, zoom, offset: [0, -120], duration: 1400 });
	}

	/** Pull back to the opening world view. */
	export function resetView() {
		map?.easeTo({ ...INITIAL_VIEW, duration: 900 });
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
			center: INITIAL_VIEW.center,
			zoom: INITIAL_VIEW.zoom,
			attributionControl: { compact: true },
			maxZoom: 18
		});

		map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

		// A single wheel notch should cover real ground. MapLibre's defaults are
		// slow enough on a mouse that zooming in feels like winching; these rates
		// are roughly 4x the wheel default and 2x the trackpad default.
		map.scrollZoom.setWheelZoomRate(1 / 110);
		map.scrollZoom.setZoomRate(1 / 50);

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

	// Re-paint pins whenever the user's collection changes
	$effect(() => {
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

	/* The device's own position: a mint pixel square, pulsing. */
	:global(.user-dot) {
		width: 14px;
		height: 14px;
		background: var(--mint);
		box-shadow:
			0 0 0 3px var(--cabinet-lo),
			0 0 0 6px rgba(63, 168, 139, 0.35);
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
				0 0 0 10px rgba(63, 168, 139, 0.18);
		}
	}

	/* MapLibre's own controls, rebuilt as cabinet switches. */
	:global(.maplibregl-ctrl-group) {
		border-radius: 0 !important;
		background: var(--cabinet) !important;
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md) !important;
		overflow: hidden;
	}
	:global(.maplibregl-ctrl-group button) {
		width: 36px !important;
		height: 36px !important;
		background: transparent !important;
	}
	:global(.maplibregl-ctrl-group button + button) {
		border-top: 2px solid var(--cabinet-lo) !important;
	}
	:global(.maplibregl-ctrl-group button:hover) {
		background: var(--cabinet-hi) !important;
	}
	/* MapLibre ships dark glyphs; invert them onto the dark cabinet. */
	:global(.maplibregl-ctrl-group button .maplibregl-ctrl-icon) {
		filter: invert(1) sepia(0.3) saturate(0.4) brightness(1.15);
	}
	:global(.maplibregl-ctrl-bottom-right) {
		margin-bottom: calc(var(--safe-bottom) + 141px);
		margin-right: 12px;
	}
	/* Desktop keeps the radar plate in that corner, so the controls move up. */
	@media (min-width: 900px) {
		:global(.maplibregl-ctrl-bottom-right) {
			margin-bottom: 214px;
			margin-right: 14px;
		}
	}
	@media (min-width: 900px) and (max-height: 620px) {
		:global(.maplibregl-ctrl-bottom-right) {
			margin-bottom: 56px;
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

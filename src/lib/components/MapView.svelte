<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import {
		trackerStyle,
		HOME_PADDING,
		homeBounds,
		MAP_COLORS
	} from '$lib/map/style';
	import { registerSprites } from '$lib/map/sprites';
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { haptic } from '$lib/effects';
	import { DISCLAIMER } from '$lib/brand';
	import { isPlainKey, isTyping } from '$lib/keys';

	let {
		onmove,
		onzoomed
	}: {
		onmove?: (c: { lng: number; lat: number; zoom: number }) => void;
		/** Fired once the visitor has zoomed enough to have clearly meant it. */
		onzoomed?: () => void;
	} = $props();

	let container: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let ready = $state(false);

	const SRC = 'timmies';
	const COUNT_FONT = ['Montserrat Bold', 'Open Sans Bold'];
	/** Never overshoot a cluster tap past street level. */
	const CLUSTER_ZOOM_CAP = 16;

	/*
	 * Flat on the way in: a lone cup has to be findable on a province-wide
	 * view, and by street level the building around it has grown far faster,
	 * so the cup settles to storefront scale. Shared by the unstamped and
	 * closed layers, which must scale identically or they would disagree at
	 * the moment a store closes.
	 */
	const CUP_SIZE_BY_ZOOM = [
		'interpolate',
		['linear'],
		['zoom'],
		3, 0.85, 8, 0.95, 13, 1.1, 17, 1.35, 20, 1.5
	] as unknown as maplibregl.DataDrivenPropertyValueSpecification<number>;

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
			clusterMaxZoom: 9,
			/*
			 * How many of the stores under a cluster are already collected.
			 * `visited` is 0 or 1 per feature, so the sum is the count, and
			 * comparing it to point_count tells the cluster whether it is
			 * finished. Recomputed by MapLibre whenever the data is set, which
			 * is what a check-in does.
			 */
			clusterProperties: { visited: ['+', ['get', 'visited']] }
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
				/*
				 * Green only when every store beneath it is collected. Anything
				 * left to do reads as red, so a cluster never suggests an area
				 * is finished while one cup is still outstanding.
				 */
				'icon-image': [
					'case',
					['==', ['get', 'visited'], ['get', 'point_count']],
					'pin-stamped',
					'pin-unstamped'
				],
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
				'icon-size': CUP_SIZE_BY_ZOOM
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
				'icon-size': CUP_SIZE_BY_ZOOM
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
				/* A second tap on the cup you are already on means "closer". */
				const again = ui.selectedId === id;
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
				focusStore(
					locations.coordsOf(id) ??
						((f.geometry as GeoJSON.Point).coordinates as [number, number]),
					again
				);
			});
			map.on('mouseenter', layer, () => (map!.getCanvas().style.cursor = 'pointer'));
			map.on('mouseleave', layer, () => (map!.getCanvas().style.cursor = ''));
		}

		/*
		 * Tapping bare map closes the card. This used to be a full-screen
		 * backdrop element, which worked but sat over the map and ate every
		 * click through it - including the second click on the selected cup
		 * that asks to zoom in closer. Asking the map what was under the
		 * pointer costs one query and leaves the cups reachable.
		 */
		map.on('click', (e) => {
			if (!ui.selectedId) return;
			const hit = map!.queryRenderedFeatures(e.point, {
				layers: ['pins', 'pins-visited', 'pins-closed', 'clusters']
			});
			if (!hit.length) ui.select(null);
		});

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
	 * Where the first tap lands. Street zoom shows the storefront but throws
	 * away the surroundings, and arriving there in one jump is disorienting
	 * when you were looking at a province a moment ago - you cannot tell what
	 * you are next to. Three levels out keeps the neighbourhood on screen; a
	 * second tap on the same cup goes the rest of the way.
	 */
	const APPROACH_ZOOM = STREET_ZOOM - 3;

	/**
	 * A selected store lands this many pixels below the map's centre rather
	 * than on it. The check-in card hangs from the top of the screen, so dead
	 * centre put the cup - and the stepper ring around it - hard against the
	 * card's bottom edge while leaving empty map below. The drop gives the
	 * ring even air on all four sides. Published to CSS as --cup-y so
	 * everything anchored to the cup (the ring, the zoom-in hotspot) moves
	 * with it.
	 */
	const SELECT_DROP = 40;

	function focusStore(center: [number, number], closer = false) {
		if (!map) return;
		const zoom = Math.max(map.getZoom(), closer ? STREET_ZOOM : APPROACH_ZOOM);
		/*
		 * flyTo, not easeTo. Tapping a cup on a country-wide view is a fourteen
		 * level jump, and easeTo interpolates zoom and centre independently, so
		 * it drifts and lands off-target - the reason a first tap missed and a
		 * second, now a short hop, worked. flyTo is built for exactly this.
		 */
		map.flyTo({ center, zoom, offset: [0, SELECT_DROP], duration: 900, essential: true });
	}

	export function flyTo(center: [number, number], zoom = STREET_ZOOM) {
		map?.flyTo({ center, zoom, duration: 1400 });
	}

	/** The second half of the approach, from neighbourhood to storefront. */
	export function goCloser(center: [number, number]) {
		map?.flyTo({
			center,
			zoom: STREET_ZOOM,
			offset: [0, SELECT_DROP],
			duration: 700,
			essential: true
		});
	}

	/**
	 * Move to a neighbouring store, keeping the zoom you were browsing at.
	 * Walking a street at rooftop level should stay there, and surveying a city
	 * at district level likewise - the arrows change where you are, not how
	 * close.
	 */
	export function stepTo(center: [number, number]) {
		if (!map) return;
		map.flyTo({
			center,
			zoom: Math.max(map.getZoom(), APPROACH_ZOOM),
			offset: [0, SELECT_DROP],
			duration: 700,
			essential: true
		});
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

	/*
	 * The compass buttons count as knowing how to zoom, even though they are
	 * not the gesture the hint describes - someone who has found them does not
	 * need to be told the map zooms.
	 */
	export function zoomIn() {
		map?.easeTo({ zoom: (map?.getZoom() ?? 0) + 1.2, duration: 350 });
		onzoomed?.();
	}

	export function zoomOut() {
		map?.easeTo({ zoom: (map?.getZoom() ?? 0) - 1.2, duration: 350 });
		onzoomed?.();
	}

	/**
	 * Back to the opening view: the whole of Canada, framed as bounds so it
	 * fills whatever screen it lands on. A fixed zoom showed Canada on a desktop
	 * window and the Great Lakes on a phone.
	 */
	export function resetView() {
		fitBounds(homeBounds(), HOME_PADDING, 900);
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
			bounds: (() => {
				const b = homeBounds();
				return [
					[b[0], b[1]],
					[b[2], b[3]]
				] as [[number, number], [number, number]];
			})(),
			fitBoundsOptions: { padding: HOME_PADDING },
			/*
			 * The attribution bar is the one piece of chrome that is always on
			 * the main screen and already exists to carry credits, so the
			 * affiliation disclaimer lives there rather than as a banner nobody
			 * would keep.
			 */
			attributionControl: {
				compact: true,
				customAttribution: DISCLAIMER
			},
			maxZoom: 18
		});

		// A single wheel notch should cover real ground. MapLibre's defaults are
		// slow enough on a mouse that zooming in feels like winching; these rates
		// are roughly 4x the wheel default and 2x the trackpad default.
		map.scrollZoom.setWheelZoomRate(1 / 110);
		map.scrollZoom.setZoomRate(1 / 50);

		/*
		 * Flat, always. A two-finger drag tilts and rotates by default, which on
		 * a phone is almost never deliberate - it is what a slightly uneven
		 * pinch does - and it leaves the map skewed with no obvious way back.
		 * There is nothing here that a tilted view shows better: the basemap is
		 * a flat tracker style with no buildings or terrain.
		 */
		map.dragRotate.disable();
		map.touchZoomRotate.disableRotation();
		map.touchPitch.disable();

		// Dev-only handle, for driving the map from a console or a test harness.
		if (import.meta.env.DEV) (window as unknown as { __map?: unknown }).__map = map;


		map.on('load', async () => {
			await locations.load();
			addLayers();
		});

		/*
		 * Watch for the visitor zooming on purpose, which is what retires the
		 * hint in the corner.
		 *
		 * Only gestures count - a zoom carrying an originalEvent - so flying to
		 * a search result or opening a cluster does not answer a question about
		 * how to zoom that nobody has yet been shown the answer to. The
		 * threshold is a bit under a full level, so one decisive scroll or
		 * pinch is enough while a stray touch is not.
		 */
		let zoomedBy = 0;
		let lastZoom = map.getZoom();
		map.on('zoom', (e) => {
			const now = map!.getZoom();
			if ((e as { originalEvent?: Event }).originalEvent) zoomedBy += Math.abs(now - lastZoom);
			lastZoom = now;
			if (zoomedBy >= 0.8) onzoomed?.();
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

		const releaseKeys = bindArrowPanning(map);
		const releaseCentre = publishMapCentre(map);

		return () => {
			clearInterval(blinkTimer);
			stopLocating();
			releaseKeys();
			releaseCentre();
			map?.remove();
		};
	});

	/**
	 * Select whatever store is closest to the middle of the screen and centre
	 * it, keeping the zoom you were browsing at. A hidden closure is skipped,
	 * for the same reason the arrows skip it: landing on a card with no cup
	 * under it explains nothing.
	 */
	function snapToNearest() {
		if (!map) return;
		const c = map.getCenter();
		const id = locations.nearestTo(
			[c.lng, c.lat],
			(p) => !p.closed || settings.showClosed || passport.isVisited(p.id)
		);
		if (!id) return;
		const coords = locations.coordsOf(id);
		if (!coords) return;
		haptic(8);
		ui.select(id);
		stepTo(coords);
	}

	/**
	 * Publish where the map's centre actually is, in viewport pixels.
	 *
	 * A selected store sits there, so everything that has to line up with it -
	 * the stepper's arrows, the zoom-closer hotspot, the ceiling on how tall
	 * the card may grow before it would cover the cup - needs the number.
	 *
	 * It is not the middle of the window, and it is not the middle of the
	 * cabinet either: the frame and the bottom dock take their own bites, and
	 * they differ between phone and desktop. Measuring the canvas is the only
	 * way to be right on both.
	 */
	function publishMapCentre(m: maplibregl.Map): () => void {
		const root = document.documentElement;
		const canvas = m.getCanvas();
		const sync = () => {
			const r = canvas.getBoundingClientRect();
			root.style.setProperty('--map-cx', `${Math.round(r.left + r.width / 2)}px`);
			root.style.setProperty('--map-cy', `${Math.round(r.top + r.height / 2)}px`);
			root.style.setProperty('--cup-y', `${Math.round(r.top + r.height / 2) + SELECT_DROP}px`);
		};
		sync();
		const ro = new ResizeObserver(sync);
		ro.observe(canvas);
		window.addEventListener('resize', sync);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', sync);
			root.style.removeProperty('--map-cx');
			root.style.removeProperty('--map-cy');
			root.style.removeProperty('--cup-y');
		};
	}

	/**
	 * Hold an arrow key to glide across the map.
	 *
	 * MapLibre's own keyboard handler moves a fixed step per keypress, so
	 * holding a key inherits the operating system's repeat behaviour: a pause,
	 * then a stutter of discrete jumps. Panning per animation frame instead
	 * makes holding a key a continuous glide and a tap a small nudge, with no
	 * special case between the two.
	 *
	 * Arrows belong to whatever is most specific: a text field first, then a
	 * selected store, where they step to the neighbouring one. The map only
	 * takes them when nothing else wants them.
	 *
	 * Escape drops the selection, and space snaps to whichever store is
	 * nearest the middle of the screen - the one you were already looking at,
	 * at whatever zoom you happen to be at.
	 */
	function bindArrowPanning(m: maplibregl.Map): () => void {
		const KEYS: Record<string, [number, number]> = {
			ArrowUp: [0, -1],
			ArrowDown: [0, 1],
			ArrowLeft: [-1, 0],
			ArrowRight: [1, 0]
		};
		/* Pixels per frame at 60fps - about a screen-width every second. */
		const SPEED = 11;

		m.keyboard.disable();
		const held = new Set<string>();
		let frame: number | undefined;

		const step = () => {
			let dx = 0;
			let dy = 0;
			for (const key of held) {
				dx += KEYS[key][0];
				dy += KEYS[key][1];
			}
			if (dx || dy) m.panBy([dx * SPEED, dy * SPEED], { duration: 0 }, { keyboard: true });
			frame = held.size ? requestAnimationFrame(step) : undefined;
		};

		const onDown = (e: KeyboardEvent) => {
			if (!isPlainKey(e) || isTyping(e.target)) return;

			if (e.key === 'Escape') {
				if (!ui.selectedId) return;
				e.preventDefault();
				ui.select(null);
				return;
			}

			/* Space is a page-scroll by default, so it has to be claimed. */
			if (e.key === ' ' || e.code === 'Space') {
				e.preventDefault();
				snapToNearest();
				return;
			}

			if (!(e.key in KEYS) || ui.selectedId) return;
			e.preventDefault();
			held.add(e.key);
			if (frame === undefined) frame = requestAnimationFrame(step);
		};
		const onUp = (e: KeyboardEvent) => held.delete(e.key);
		/* Tabbing away mid-hold would otherwise leave the map drifting forever. */
		const onBlur = () => held.clear();

		window.addEventListener('keydown', onDown);
		window.addEventListener('keyup', onUp);
		window.addEventListener('blur', onBlur);

		return () => {
			window.removeEventListener('keydown', onDown);
			window.removeEventListener('keyup', onUp);
			window.removeEventListener('blur', onBlur);
			if (frame !== undefined) cancelAnimationFrame(frame);
		};
	}

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

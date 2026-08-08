<script lang="ts">
	import { untrack } from 'svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { confettiBurst, haptic } from '$lib/effects';
	import { locationLabel, locationPlace } from '$lib/location';
	import { report } from '$lib/stores/report.svelte';
	import { fetchLocationStats } from '$lib/api';
	import { env } from '$env/dynamic/public';

	const loc = $derived(ui.selectedId ? locations.get(ui.selectedId) : undefined);
	const visited = $derived(ui.selectedId ? passport.isVisited(ui.selectedId) : false);

	let stamping = $state(false);
	let btnEl = $state<HTMLButtonElement>();
	let streetOpen = $state(false);

	/**
	 * How many other passports have this one - a global, authenticated count,
	 * fetched fresh per store since it changes as other people check in and is
	 * cheap enough not to bother caching. Zero and "cloud backend not
	 * configured" look identical from here, which is correct: neither is
	 * something worth telling a visitor about, so the line just does not
	 * appear.
	 */
	let checkInCount = $state(0);
	$effect(() => {
		const id = ui.selectedId;
		checkInCount = 0;
		if (!id) return;
		fetchLocationStats(id).then((stats) => {
			if (ui.selectedId === id) checkInCount = stats?.checkInCount ?? 0;
		});
	});

	/**
	 * Street View, through the Maps Embed API.
	 *
	 * This used to use the keyless `output=svembed` endpoint, which works but is
	 * not a documented interface and sits outside Google's terms. The supported
	 * one needs a public key, so without PUBLIC_GOOGLE_MAPS_KEY the panel simply
	 * is not offered - better than shipping a call we are not entitled to make.
	 * "Open in Maps" still works either way, since linking is always allowed.
	 */
	const mapsKey = env.PUBLIC_GOOGLE_MAPS_KEY ?? '';
	const coords = $derived(ui.selectedId ? locations.coordsOf(ui.selectedId) : undefined);
	const closed = $derived(!!loc?.closed);

	/**
	 * A report opens the in-app form with the store already identified. OSM is
	 * the source of truth and lags reality, so a human saying "this one is
	 * gone" is often the first signal there is - which makes it worth removing
	 * every step between noticing and saying so.
	 */
	function openReport() {
		if (!loc || !coords) return;
		const where = locationPlace(loc);
		report.start({
			kind: 'location',
			subject: where ? `${locationLabel(loc)}, ${where}` : locationLabel(loc),
			storeId: `${ui.selectedId} (${coords[1]}, ${coords[0]})`
		});
	}

	const streetUrl = $derived(
		coords && mapsKey
			? `https://www.google.com/maps/embed/v1/streetview?key=${mapsKey}&location=${coords[1]},${coords[0]}&heading=0&pitch=0&fov=90`
			: ''
	);

	/** Coverage is patchy for stores set back from the road, so never a dead end. */
	const mapsUrl = $derived(
		coords ? `https://www.google.com/maps/search/?api=1&query=${coords[1]},${coords[0]}` : '#'
	);

	/*
	 * Open on arrival. Seeing the storefront is most of why you opened the
	 * card, and the Embed API bills nothing for it - Google's own terms put
	 * the Maps Embed API at no charge with unlimited requests - so there is
	 * nothing to save by making people ask twice.
	 */
	let userToggledStreet = $state(false);
	let svEl = $state<HTMLElement>();

	$effect(() => {
		void ui.selectedId;
		userToggledStreet = false;
		streetOpen = !!streetUrl;
	});

	/**
	 * Show the street view only when it earns its space. The flex squeeze can
	 * take the panel down to 56px, and at that size it is Google's attribution
	 * bar with a sliver of sky behind it - congestion, not imagery. Measure
	 * what layout actually gave it: under 120px the auto-open takes itself
	 * back and the card stays compact, with the map visible behind it. A
	 * visitor who opens it by hand instead pins it at full height (see
	 * .street-view.pinned) - never the squeeze, which at hand-open sizes was
	 * an attribution bar posing as imagery.
	 */
	const SV_USEFUL_PX = 120;
	$effect(() => {
		void ui.selectedId;
		const el = svEl;
		const fit = () => {
			if (userToggledStreet || !el || !el.isConnected) return;
			if (el.getBoundingClientRect().height < SV_USEFUL_PX) {
				untrack(() => (streetOpen = false));
			}
		};
		// Two frames: the card's own grow-by-shortfall measurement runs first,
		// and this must judge the height that layout finally settled on.
		let raf = 0;
		if (el) {
			raf = requestAnimationFrame(() => {
				raf = requestAnimationFrame(fit);
			});
		}
		/*
		 * Registered whether or not the panel is currently mounted - an
		 * auto-closed panel has no element, and the earlier version bailed
		 * before attaching this, so a window grown back to a useful size
		 * never got its street view back. Reopening mounts the element,
		 * which re-runs this effect, which re-measures honestly.
		 */
		const onResize = () => {
			if (!userToggledStreet && streetUrl && !untrack(() => streetOpen)) {
				untrack(() => (streetOpen = true));
			} else {
				requestAnimationFrame(fit);
			}
		};
		window.addEventListener('resize', onResize);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', onResize);
		};
	});

	$effect(() => {
		ui.stamping = stamping;
	});

	function close() {
		ui.select(null);
	}

	function onCheckIn() {
		if (!ui.selectedId) return;
		const becameVisited = passport.toggle(ui.selectedId);
		/*
		 * Only when signed in: an anonymous check-in never reaches the global
		 * count on the server either, so bumping it here would make this card
		 * claim something the next visitor's card would quietly contradict.
		 */
		if (passport.cloud) checkInCount = Math.max(0, checkInCount + (becameVisited ? 1 : -1));
		if (becameVisited) {
			stamping = true;
			haptic([12, 30, 60]);
			if (btnEl) {
				const r = btnEl.getBoundingClientRect();
				confettiBurst(r.left + r.width / 2, r.top + r.height / 2);
			}
			ui.maybeNudge(passport.count, passport.cloud);
			const n = passport.count;
			if ([10, 50, 100].includes(n))
				ui.toast({ emoji: '🎉', title: `${n} stamps!`, body: 'Keep the streak going.' });
			setTimeout(() => (stamping = false), 1900);
		} else {
			haptic(8);
		}
	}


	/*
	 * The escape hatch for when the ceiling is simply too low. The card's
	 * height is capped to stay clear of the cup, and the street view squeezes
	 * to make everything fit under that cap - but a cramped viewport or a
	 * card with every optional line (venue, stamped-by, two-line address) can
	 * need more than the cap allows even fully squeezed. Every control being
	 * visible outranks keeping clear of the cup, so measure the shortfall and
	 * grow by exactly that much - not a fixed floor, which covered the cup on
	 * phones that never needed the help.
	 */
	let sheetEl = $state<HTMLElement>();
	let overrideMax = $state<number | null>(null);

	$effect(() => {
		void ui.selectedId; // re-arm per selection
		overrideMax = null;
		const el = sheetEl;
		if (!el) return;
		/*
		 * check() both reads and writes overrideMax. Called bare inside this
		 * effect, the read subscribes the effect to the very state it writes,
		 * and Svelte kills the resulting loop with effect_update_depth_exceeded
		 * - an uncaught error that takes the whole app's reactivity down with
		 * it, which surfaced as a Stamp button that received every tap and did
		 * nothing. The observer and resize callbacks are already untracked
		 * because they run outside the effect; only the synchronous first call
		 * needs the same treatment.
		 */
		const check = () => {
			if (el.scrollHeight > el.clientHeight + 1) {
				const top = el.getBoundingClientRect().top;
				// +8: borders sit outside scrollHeight under border-box sizing.
				// Growth is monotonic within one selection - only ever upward -
				// so measure and layout cannot chase each other in a loop.
				const need = Math.min(el.scrollHeight + 8, window.innerHeight - top - 12);
				if (overrideMax === null || need > overrideMax) overrideMax = need;
			}
		};
		/* A resize changes the ceiling itself, so the override starts over. */
		const onResize = () => {
			overrideMax = null;
			requestAnimationFrame(check);
		};
		const ro = new ResizeObserver(check);
		ro.observe(el);
		const inner = el.querySelector('.inner');
		if (inner) ro.observe(inner);
		window.addEventListener('resize', onResize);
		untrack(check);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', onResize);
		};
	});

	// Drag-to-dismiss
	let dragY = $state(0);
	let dragging = false;
	let startY = 0;
	function onPointerDown(e: PointerEvent) {
		dragging = true;
		startY = e.clientY;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onPointerMove(e: PointerEvent) {
		if (!dragging) return;
		// Rubber-band: pulling up past the stop barely moves.
		const dy = e.clientY - startY;
		dragY = dy >= 0 ? dy : dy / 6;
	}
	function onPointerUp() {
		dragging = false;
		if (dragY > 110) close();
		dragY = 0;
	}
</script>

{#if loc}
	<!--
		The stamp is a screen overlay, not part of the card. Anchored to the
		check-in button it sat inside the card's scroll box, and `overflow-y:
		auto` clips both axes - so the opening frames, which start at two and a
		half times size, were sliced off at the card's edge. Out here it has the
		whole screen to land on, and lands in the middle of it.
	-->
	{#if stamping}
		<span class="stamp pixel" aria-hidden="true">VISITED</span>
	{/if}

	<!--
		No full-screen backdrop. It was only ever a dismiss target, and being
		full-screen it also swallowed every click on the map underneath -
		including a second click on the selected cup, which is how you ask to
		zoom in closer. The map deselects on a click that hits no cup, which is
		the same gesture without the overlay.
	-->
	<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
	<section
		bind:this={sheetEl}
		class="sheet"
		data-checkin-card
		style="transform: translate(-50%, {dragY}px);{overrideMax ? ` max-height:${overrideMax}px;` : ''}"
		role="dialog"
		aria-modal="true"
		aria-label={loc.name}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="grab"
			role="presentation"
			onpointerdown={onPointerDown}
			onpointermove={onPointerMove}
			onpointerup={onPointerUp}
		>
			<span class="grabber"></span>
		</div>

		<div class="inner">
			<header class="head">
				<div class="titles">
					<h2 class="pixel">{locationLabel(loc)}</h2>
					<p class="addr">{locationPlace(loc) || loc.name}</p>
					{#if loc.venue}
						<p class="venue">{loc.venue}</p>
					{/if}
					{#if closed}
						<p class="closed pixel">Permanently closed</p>
					{:else if checkInCount > 0}
						<p class="stamped-by">
							{checkInCount.toLocaleString()}
							{checkInCount === 1 ? 'person has' : 'people have'} stamped here
						</p>
					{/if}
				</div>
			</header>

			<div class="links">
				{#if streetUrl}
					<button
						class="link"
						aria-expanded={streetOpen}
						onclick={() => {
							userToggledStreet = true;
							streetOpen = !streetOpen;
						}}
					>
						{streetOpen ? 'Hide street view' : 'Street view'}
					</button>
				{/if}
				<a class="link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
					Open in Maps &#8599;
				</a>
				<button class="link quiet" type="button" onclick={openReport}>Report</button>
			</div>

			{#if streetOpen && streetUrl}
				<div class="street-view" class:pinned={userToggledStreet} bind:this={svEl}>
					<iframe
						title="Street view of {locationLabel(loc)}"
						src={streetUrl}
						loading="lazy"
						referrerpolicy="no-referrer-when-downgrade"
						allowfullscreen
					></iframe>
				</div>
			{/if}

				<button
					bind:this={btnEl}
					class="pbtn {visited ? 'pbtn-green' : 'pbtn-gold'} checkin"
					onclick={onCheckIn}
				>
					{#if visited}
						<!-- Drawn, not typed: the pixel font has no tick, so a text
						     glyph falls back to Inter and renders tiny beside it. -->
						<svg class="tick" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M4 13l6 6L20 5"
								fill="none"
								stroke="currentColor"
								stroke-width="4"
								stroke-linecap="square"
								stroke-linejoin="miter"
							/>
						</svg>
						Collected
					{:else}
						Stamp it
					{/if}
				</button>


		</div>
	</section>
{/if}

<style>
	/*
	 * The cartridge floats directly above the selected cup, which the map
	 * centres, so the marker you are about to stamp stays visible instead of
	 * being covered by its own dialog.
	 */
	.sheet {
		position: fixed;
		/*
		 * Docked under the top bar rather than floating a fixed distance above
		 * the cup. The map centres the cup in the visible band, and a card tall
		 * enough to reach up from there would collide with the top bar - this
		 * way neither can ever cover the other, whatever the card contains.
		 */
		top: calc(var(--safe-top) + 66px);
		bottom: auto;
		left: 50%;
		transform: translateX(-50%);
		z-index: 41;
		width: min(360px, calc(100vw - 28px));
		/*
		 * Stops short of the cup rather than at some fraction of the window.
		 * --map-cy is the map's real centre, which is where a selected store
		 * sits; the 52px keeps clear of the cup and its reticle. Falls back to
		 * half the viewport for the instant before the map has measured.
		 */
		max-height: calc(var(--map-cy, 50dvh) - var(--safe-top) - 66px - 52px);
		/*
		 * Never a scrollbox. A card that scrolls hides its own Stamp button
		 * below the fold, and on a phone that is the one control the card
		 * exists for. Flex column instead: everything keeps its natural size
		 * except the street view, which is the one element that can give up
		 * height without costing a control.
		 */
		display: flex;
		flex-direction: column;
		overflow: hidden;
		transition: max-height 0.2s linear;
		/* Translucent so the street underneath stays readable. */
		background: rgba(43, 26, 20, 0.86);
		border-top: 3px solid var(--cabinet-hi);
		border-left: 3px solid var(--cabinet-hi);
		border-right: 3px solid var(--cabinet-lo);
		border-bottom: 3px solid var(--cabinet-lo);
		box-shadow: var(--bevel-lg);
		animation: rise 0.22s steps(5, end);
		/* The card owns vertical drags; the map keeps its own gestures. */
		touch-action: none;
	}
	.inner {
		padding: 0 0.9rem 0.75rem;
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		/* Without this a flex child refuses to shrink below its content. */
		min-height: 0;
	}
	.grab {
		flex: none;
		display: flex;
		justify-content: center;
		padding: 0.35rem 0 0.3rem;
		cursor: grab;
	}
	.grabber {
		width: 36px;
		height: 5px;
		background: var(--cabinet-hi);
		box-shadow: inset 2px 2px 0 var(--cabinet-lo);
	}

	.head {
		flex: none;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.6rem;
		margin-bottom: 0.5rem;
	}
	.titles {
		min-width: 0;
	}
	h2 {
		font-size: 0.58rem;
		line-height: 1.65;
		color: var(--gold);
		/* A long address wraps twice and stops - the space belongs to the
		   imagery and the button, not to a third line of street name. */
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.addr {
		margin: 0.4rem 0 0;
		color: var(--cream-dim);
		font-size: 0.8rem;
		line-height: 1.4;
	}

	/* Secondary actions: text links, not buttons competing with Stamp it. */
	.links {
		flex: none;
		display: flex;
		gap: 0.9rem;
		margin: 0 0 0.5rem;
	}
	.link {
		padding: 0.25rem 0;
		font-family: var(--font-sans);
		font-size: 0.78rem;
		color: var(--gold);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.link:hover {
		color: #ffc450;
	}
	/* Rarely needed, so it should not compete with the other two. */
	.link.quiet {
		margin-left: auto;
		color: var(--cream-dim);
	}
	.link.quiet:hover {
		color: var(--cream);
	}

	.venue {
		margin: 0.2rem 0 0;
		font-size: 0.85rem;
		color: var(--gold);
	}
	.stamped-by {
		margin: 0.35rem 0 0;
		font-size: 0.78rem;
		color: var(--cream-dim);
	}
	.closed {
		margin: 0.45rem 0 0;
		font-size: 0.42rem;
		line-height: 1.6;
		color: #ff8f94;
	}

	/* Recessed like a screen set into the cartridge. */
	.street-view {
		position: relative;
		margin-bottom: 0.55rem;
		/*
		 * 150px when the card has room, squeezed as far as 64px when it does
		 * not - still recognisably the storefront, and the button stays put.
		 *
		 * The iframe inside is absolutely positioned so it contributes no
		 * intrinsic size to this flex item. That is not decoration: iframes
		 * carry an intrinsic 150px height, and WebKit treats it as a floor
		 * this item may not shrink past even with min-height set lower -
		 * Chrome honoured the override, Safari clipped the Stamp button off
		 * the bottom of the card instead. With the iframe out of layout, the
		 * min-height below is the only floor there is, in every engine.
		 */
		flex: 0 1 150px;
		min-height: 56px;
		overflow: hidden;
		background: var(--screen-deep);
		border-top: 2px solid var(--cabinet-lo);
		border-left: 2px solid var(--cabinet-lo);
		border-right: 2px solid var(--cabinet-hi);
		border-bottom: 2px solid var(--cabinet-hi);
	}
	/*
	 * An explicitly opened panel never gets the squeeze - a hand-opened
	 * street view at 60px is an attribution bar, not a product. Pinned to
	 * full height, and the card's grow-by-shortfall measurement makes the
	 * room, over the cup if it has to; that is the right trade for a visitor
	 * who just asked to see the storefront.
	 */
	.street-view.pinned {
		flex: none;
		height: 150px;
	}
	.street-view iframe {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
	}

	.checkin {
		flex: none;
		width: 100%;
		font-size: 0.62rem;
		padding: 0.7rem;
		min-height: 44px;
	}
	/*
	 * An idle pulse invites the press. It animates the glow rather than the
	 * transform, so :active keeps its travel - animations outrank normal
	 * declarations, and animating transform here would swallow the press.
	 */
	.checkin:not(.pbtn-green) {
		animation: invite 1.6s steps(2, end) infinite;
	}
	.checkin:active {
		transform: translate(4px, 4px);
	}
	@keyframes invite {
		50% {
			box-shadow:
				var(--bevel-md),
				0 0 0 5px rgba(242, 177, 52, 0.3);
		}
	}
	.tick {
		width: 1.5em;
		height: 1.5em;
		flex: none;
	}

	/* Six-frame pixel thunk, dead centre of the screen. */
	.stamp {
		position: fixed;
		left: 50%;
		top: 50%;
		z-index: 60;
		padding: 0.7rem 1.4rem;
		font-size: 1.05rem;
		white-space: nowrap;
		color: var(--tim-red);
		border: 4px solid var(--tim-red);
		background: rgba(21, 13, 10, 0.55);
		opacity: 0;
		pointer-events: none;
		animation: slam 1.9s steps(8, end) forwards;
	}



	@keyframes rise {
		from {
			transform: translate(-50%, 12px);
			opacity: 0;
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	/* Slams down fast, then sits there long enough to read before it lifts. */
	@keyframes slam {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) rotate(-8deg) scale(2.6);
		}
		18% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(-8deg) scale(0.9);
		}
		26% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(-8deg) scale(1.06);
		}
		80% {
			opacity: 1;
			transform: translate(-50%, -50%) rotate(-8deg) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) rotate(-8deg) scale(1);
		}
	}
</style>

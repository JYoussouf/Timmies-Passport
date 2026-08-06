<script lang="ts">
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { confettiBurst, haptic } from '$lib/effects';
	import { locationLabel, locationPlace } from '$lib/location';
	import { report } from '$lib/stores/report.svelte';
	import { env } from '$env/dynamic/public';

	const loc = $derived(ui.selectedId ? locations.get(ui.selectedId) : undefined);
	const visited = $derived(ui.selectedId ? passport.isVisited(ui.selectedId) : false);

	let stamping = $state(false);
	let btnEl = $state<HTMLButtonElement>();
	let streetOpen = $state(false);

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

	// A new selection should not inherit the previous card's open panel.
	$effect(() => {
		void ui.selectedId;
		streetOpen = false;
	});

	function close() {
		ui.select(null);
	}

	function onCheckIn() {
		if (!ui.selectedId) return;
		const becameVisited = passport.toggle(ui.selectedId);
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
		No full-screen backdrop. It was only ever a dismiss target, and being
		full-screen it also swallowed every click on the map underneath -
		including a second click on the selected cup, which is how you ask to
		zoom in closer. The map deselects on a click that hits no cup, which is
		the same gesture without the overlay.
	-->
	<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
	<section
		class="sheet"
		class:expanded={streetOpen}
		style="transform: translate(-50%, {streetOpen ? `calc(-50% + ${dragY}px)` : `${dragY}px`})"
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
					{#if closed}
						<p class="closed pixel">Permanently closed</p>
					{/if}
				</div>
			</header>

			<div class="links">
				{#if streetUrl}
					<button
						class="link"
						aria-expanded={streetOpen}
						onclick={() => (streetOpen = !streetOpen)}
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
				<div class="street-view">
					<iframe
						title="Street view of {locationLabel(loc)}"
						src={streetUrl}
						loading="lazy"
						referrerpolicy="no-referrer-when-downgrade"
						allowfullscreen
					></iframe>
				</div>
			{/if}

			<div class="checkin-wrap">
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
				{#if stamping}
					<span class="stamp pixel" aria-hidden="true">VISITED</span>
				{/if}
			</div>


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
		max-height: calc(50dvh - 2rem);
		overflow-y: auto;
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
		padding: 0 0.9rem 0.95rem;
	}
	/*
	 * With street view open the card is taller than the space above the marker,
	 * so it centres instead of growing off the top of the screen. Covering the
	 * cup is fine at that point - the panel is the thing being looked at.
	 */
	.sheet.expanded {
		top: 50%;
		bottom: auto;
		max-height: calc(100dvh - 2rem);
	}

	.grab {
		display: flex;
		justify-content: center;
		padding: 0.5rem 0 0.4rem;
		cursor: grab;
	}
	.grabber {
		width: 36px;
		height: 5px;
		background: var(--cabinet-hi);
		box-shadow: inset 2px 2px 0 var(--cabinet-lo);
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.6rem;
		margin-bottom: 0.7rem;
	}
	.titles {
		min-width: 0;
	}
	h2 {
		font-size: 0.58rem;
		line-height: 1.65;
		color: var(--gold);
	}
	.addr {
		margin: 0.4rem 0 0;
		color: var(--cream-dim);
		font-size: 0.8rem;
		line-height: 1.4;
	}

	/* Secondary actions: text links, not buttons competing with Stamp it. */
	.links {
		display: flex;
		gap: 0.9rem;
		margin: 0 0 0.7rem;
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

	.closed {
		margin: 0.45rem 0 0;
		font-size: 0.42rem;
		line-height: 1.6;
		color: #ff8f94;
	}

	/* Recessed like a screen set into the cartridge. */
	.street-view {
		margin-bottom: 0.75rem;
		height: 190px;
		background: var(--screen-deep);
		border-top: 2px solid var(--cabinet-lo);
		border-left: 2px solid var(--cabinet-lo);
		border-right: 2px solid var(--cabinet-hi);
		border-bottom: 2px solid var(--cabinet-hi);
	}
	.street-view iframe {
		display: block;
		width: 100%;
		height: 100%;
		border: 0;
	}

	.checkin-wrap {
		position: relative;
	}
	.checkin {
		width: 100%;
		font-size: 0.62rem;
		padding: 0.85rem;
		min-height: 46px;
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

	/* Six-frame pixel thunk. */
	.stamp {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-size: 1.05rem;
		color: var(--tim-red);
		border: 4px solid var(--tim-red);
		background: rgba(21, 13, 10, 0.35);
		transform: rotate(-8deg) scale(2.4);
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
			transform: rotate(-8deg) scale(2.6);
		}
		18% {
			opacity: 1;
			transform: rotate(-8deg) scale(0.9);
		}
		26% {
			opacity: 1;
			transform: rotate(-8deg) scale(1.06);
		}
		80% {
			opacity: 1;
			transform: rotate(-8deg) scale(1);
		}
		100% {
			opacity: 0;
			transform: rotate(-8deg) scale(1);
		}
	}
</style>

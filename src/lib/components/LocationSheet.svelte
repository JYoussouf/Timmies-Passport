<script lang="ts">
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { confettiBurst, haptic } from '$lib/effects';
	import { locationLabel, locationPlace } from '$lib/location';

	const loc = $derived(ui.selectedId ? locations.get(ui.selectedId) : undefined);
	const visited = $derived(ui.selectedId ? passport.isVisited(ui.selectedId) : false);

	let stamping = $state(false);
	let btnEl = $state<HTMLButtonElement>();
	let streetOpen = $state(false);

	/**
	 * Street View, embedded rather than linked out.
	 *
	 * This keyless embed endpoint is what Google's own "share" dialog produces;
	 * the supported alternative is the Maps Embed API, which needs a public API
	 * key. If GOOGLE_MAPS_API_KEY is ever wired through to the client, switch to
	 * https://www.google.com/maps/embed/v1/streetview.
	 */
	const streetUrl = $derived.by(() => {
		const c = ui.selectedId ? locations.coordsOf(ui.selectedId) : undefined;
		if (!c) return '';
		return `https://maps.google.com/maps?q=${c[1]},${c[0]}&layer=c&cbll=${c[1]},${c[0]}&cbp=12,0,0,0,0&output=svembed`;
	});

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
	<button class="backdrop" aria-label="Close" onclick={close}></button>
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
				</div>
			</header>

			<button
				class="pbtn street"
				aria-expanded={streetOpen}
				onclick={() => (streetOpen = !streetOpen)}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path
						d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					/>
					<circle cx="12" cy="10" r="2.4" fill="currentColor" />
				</svg>
				{streetOpen ? 'Hide street view' : 'Street view'}
			</button>

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
					class="pbtn {visited ? 'pbtn-mint' : 'pbtn-gold'} checkin"
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
	.backdrop {
		position: fixed;
		inset: 0;
		/* No tint at all: the card is foregrounded by its bevel and shadow, and
		   the map underneath is what the user came to look at. This is only a
		   click target for dismissing. */
		background: transparent;
		z-index: 40;
		border: none;
	}
	/*
	 * The cartridge floats directly above the selected cup, which the map
	 * centres, so the marker you are about to stamp stays visible instead of
	 * being covered by its own dialog.
	 */
	.sheet {
		position: fixed;
		bottom: calc(50% + 26px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 41;
		width: min(420px, calc(100vw - 24px));
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
		padding: 0 1.1rem 1.2rem;
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
		padding: 0.65rem 0 0.5rem;
		cursor: grab;
	}
	.grabber {
		width: 44px;
		height: 6px;
		background: var(--cabinet-hi);
		box-shadow: inset 2px 2px 0 var(--cabinet-lo);
	}

	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.titles {
		min-width: 0;
	}
	h2 {
		font-size: 0.72rem;
		line-height: 1.6;
		color: var(--gold);
	}
	.addr {
		margin: 0.5rem 0 0;
		color: var(--cream-dim);
		font-size: 0.88rem;
		line-height: 1.4;
	}

	.street {
		width: 100%;
		margin-bottom: 0.6rem;
		font-size: 0.55rem;
	}
	.street svg {
		width: 1.3em;
		height: 1.3em;
		flex: none;
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
		font-size: 0.78rem;
		padding: 1.15rem;
		min-height: 58px;
	}
	/*
	 * An idle pulse invites the press. It animates the glow rather than the
	 * transform, so :active keeps its travel - animations outrank normal
	 * declarations, and animating transform here would swallow the press.
	 */
	.checkin:not(.pbtn-mint) {
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

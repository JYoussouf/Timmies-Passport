<script lang="ts">
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { confettiBurst, haptic } from '$lib/effects';
	import { fetchLocationStats } from '$lib/api';
	import { locationLabel, locationPlace } from '$lib/location';

	const loc = $derived(ui.selectedId ? locations.get(ui.selectedId) : undefined);
	const visited = $derived(ui.selectedId ? passport.isVisited(ui.selectedId) : false);

	let stamping = $state(false);
	let othersCount = $state<number | null>(null);
	let note = $state('');
	let noteSaved = $state(false);
	let btnEl = $state<HTMLButtonElement>();

	// Load the per-location note + global count whenever the selection changes
	$effect(() => {
		const id = ui.selectedId;
		othersCount = null;
		if (!id) return;
		note = passport.getNote(id);
		noteSaved = false;
		fetchLocationStats(id).then((s) => {
			if (ui.selectedId === id) othersCount = s?.checkInCount ?? null;
		});
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
			ui.toast({
				emoji: '🎟️',
				title: 'Stamped!',
				body: locationLabel(loc)
			});
			ui.maybeNudge(passport.count, passport.cloud);
			const n = passport.count;
			if ([10, 50, 100].includes(n))
				ui.toast({ emoji: '🏅', title: `${n} stamps!`, body: 'A new badge is yours.' });
			setTimeout(() => (stamping = false), 900);
		} else {
			haptic(8);
		}
	}

	function saveNote() {
		if (!ui.selectedId) return;
		passport.setNote(ui.selectedId, note);
		noteSaved = true;
		setTimeout(() => (noteSaved = false), 1600);
	}

	const mapsUrl = $derived.by(() => {
		if (!ui.selectedId) return '#';
		const c = locations.coordsOf(ui.selectedId);
		if (!c) return '#';
		return `https://www.google.com/maps/search/?api=1&query=${c[1]},${c[0]}`;
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
	<button class="backdrop" aria-label="Close" onclick={close}></button>
	<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
	<section
		class="sheet"
		style="transform: translate(-50%, calc(-50% + {dragY}px))"
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
				{#if loc.country_code}
					<span class="cc pixel" title={loc.country}>{loc.country_code}</span>
				{/if}
			</header>

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

			<div class="stats">
				<span class="others">
					{#if othersCount === null}
						<em>Counting check-ins…</em>
					{:else}
						<strong>{othersCount.toLocaleString()}</strong> passport holder{othersCount === 1
							? ''
							: 's'} checked in
					{/if}
				</span>
				<a class="maps pixel" href={mapsUrl} target="_blank" rel="noopener noreferrer">Maps &#8599;</a>
			</div>

			{#if visited}
				<label class="note">
					<span class="pixel">Your private note</span>
					<textarea
						bind:value={note}
						rows="2"
						placeholder="Apple fritter and a double-double, no notes"
						onblur={saveNote}
					></textarea>
					<small class:saved={noteSaved}>{noteSaved ? 'Saved ✓' : 'Only you can see this'}</small>
				</label>
			{/if}
		</div>
	</section>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(8, 15, 26, 0.8);
		z-index: 40;
		animation: fade 0.2s steps(3, end);
		border: none;
	}
	/*
	 * The cartridge: a centred card, so the store you are about to stamp is the
	 * only thing on screen rather than something tucked into a corner.
	 */
	.sheet {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 41;
		width: min(420px, calc(100vw - 24px));
		max-height: calc(100dvh - 2rem);
		overflow-y: auto;
		background: var(--cabinet);
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
	.cc {
		flex: none;
		font-size: 0.5rem;
		color: var(--cream);
		background: var(--screen-deep);
		border: 2px solid var(--cabinet-lo);
		padding: 0.4rem 0.45rem;
	}

	.checkin-wrap {
		position: relative;
	}
	.checkin {
		width: 100%;
		font-size: 0.72rem;
		padding: 1.05rem;
		min-height: 52px;
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
		animation: slam 0.9s steps(6, end) forwards;
	}

	.stats {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin: 1rem 0 0;
		font-size: 0.85rem;
		color: var(--cream-dim);
	}
	.others strong {
		color: var(--cream);
	}
	.maps {
		flex: none;
		font-size: 0.5rem;
		color: var(--gold);
		text-decoration: none;
		padding: 0.55rem 0;
	}
	.maps:hover {
		text-decoration: underline;
	}

	.note {
		display: block;
		margin-top: 1.1rem;
	}
	.note > span {
		font-size: 0.45rem;
		color: var(--cream-dim);
	}
	textarea {
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.7rem;
		font-family: var(--font-sans);
		font-size: 0.95rem;
		resize: none;
		background: var(--screen-deep);
		color: var(--cream);
		border-top: 2px solid var(--cabinet-lo);
		border-left: 2px solid var(--cabinet-lo);
		border-right: 2px solid var(--cabinet-hi);
		border-bottom: 2px solid var(--cabinet-hi);
	}
	textarea:focus {
		outline: 3px solid var(--gold);
		outline-offset: 0;
	}
	.note small {
		display: block;
		margin-top: 0.4rem;
		color: var(--cream-dim);
		font-size: 0.75rem;
	}
	.note small.saved {
		color: var(--mint);
	}

	@keyframes rise {
		from {
			transform: translate(-50%, -50%) scale(0.9);
			opacity: 0;
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@keyframes slam {
		0% {
			opacity: 0;
			transform: rotate(-8deg) scale(2.6);
		}
		40% {
			opacity: 1;
			transform: rotate(-8deg) scale(0.9);
		}
		60% {
			opacity: 1;
			transform: rotate(-8deg) scale(1.06);
		}
		100% {
			opacity: 0;
			transform: rotate(-8deg) scale(1);
		}
	}
</style>

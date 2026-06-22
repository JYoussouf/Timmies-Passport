<script lang="ts">
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { confettiBurst, haptic } from '$lib/effects';
	import { fetchLocationStats } from '$lib/api';

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
			ui.toast({ emoji: '🎟️', title: 'Stamped!', body: loc?.name ?? 'Location collected.' });
			ui.maybeNudge(passport.count, passport.cloud);
			// celebrate milestones
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
		const c = locations.coords.get(ui.selectedId);
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
		dragY = Math.max(0, e.clientY - startY);
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
		style="transform: translateY({dragY}px)"
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

		<header class="head">
			<div>
				<h2>{loc.name}</h2>
				<p class="addr">
					{[loc.address, loc.city, loc.region].filter(Boolean).join(', ') ||
						loc.country ||
						'Tim Hortons'}
				</p>
			</div>
			{#if loc.country_code}
				<span class="flag" title={loc.country}>{loc.country_code}</span>
			{/if}
		</header>

		<div class="checkin-wrap">
			<button
				bind:this={btnEl}
				class="checkin {visited ? 'done' : ''}"
				onclick={onCheckIn}
			>
				{#if visited}
					<span class="ink">✓</span> Collected
				{:else}
					Check in here
				{/if}
			</button>
			{#if stamping}
				<span class="stamp" aria-hidden="true">VISITED</span>
			{/if}
		</div>

		<div class="stats">
			<span class="others">
				🧑‍🤝‍🧑
				{#if othersCount === null}
					<em>counting…</em>
				{:else}
					<strong>{othersCount.toLocaleString()}</strong> passport holder{othersCount === 1
						? ''
						: 's'} checked in
				{/if}
			</span>
			<a class="maps" href={mapsUrl} target="_blank" rel="noopener noreferrer">View on Maps ↗</a>
		</div>

		{#if visited}
			<label class="note">
				<span>Your private note</span>
				<textarea
					bind:value={note}
					rows="2"
					placeholder="Best date square ever, met an old friend…"
					onblur={saveNote}
				></textarea>
				<small class:saved={noteSaved}>{noteSaved ? 'Saved ✓' : 'Only you can see this'}</small>
			</label>
		{/if}
	</section>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(43, 26, 20, 0.32);
		backdrop-filter: blur(2px);
		z-index: 40;
		animation: fade 0.25s ease;
		border: none;
	}
	.sheet {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 41;
		background: var(--surface);
		border-radius: var(--r-xl) var(--r-xl) 0 0;
		box-shadow: var(--shadow-lg);
		padding: 0 1.25rem calc(1.25rem + var(--safe-bottom));
		max-width: 560px;
		margin: 0 auto;
		animation: rise 0.42s var(--ease-out);
		touch-action: none;
	}
	@media (min-width: 720px) {
		.sheet {
			bottom: 18px;
			border-radius: var(--r-xl);
			right: 18px;
			left: auto;
			margin: 0;
			width: 400px;
		}
	}
	.grab {
		display: flex;
		justify-content: center;
		padding: 0.7rem 0 0.4rem;
		cursor: grab;
	}
	.grabber {
		width: 42px;
		height: 5px;
		border-radius: 999px;
		background: var(--cream-deep);
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	h2 {
		font-size: 1.35rem;
		line-height: 1.15;
	}
	.addr {
		margin: 0.3rem 0 0;
		color: var(--ink-soft);
		font-size: 0.92rem;
	}
	.flag {
		flex: none;
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--coffee);
		background: var(--surface-2);
		padding: 0.3rem 0.5rem;
		border-radius: 8px;
	}
	.checkin-wrap {
		position: relative;
	}
	.checkin {
		width: 100%;
		font-size: 1.05rem;
		font-weight: 700;
		padding: 1rem;
		border-radius: var(--r-md);
		background: var(--accent);
		color: #fff;
		box-shadow: 0 8px 22px rgba(216, 35, 42, 0.34);
		transition: transform 0.16s var(--ease-spring), background 0.2s;
	}
	.checkin:active {
		transform: scale(0.97);
	}
	.checkin.done {
		background: var(--mint);
		box-shadow: 0 8px 22px rgba(47, 125, 107, 0.3);
	}
	.checkin .ink {
		font-weight: 900;
	}
	.stamp {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-family: var(--font-display);
		font-weight: 800;
		letter-spacing: 0.18em;
		font-size: 1.7rem;
		color: var(--tim-red);
		border: 4px solid var(--tim-red);
		border-radius: 12px;
		transform: rotate(-12deg) scale(2.4);
		opacity: 0;
		pointer-events: none;
		animation: slam 0.9s var(--ease-spring) forwards;
		mix-blend-mode: multiply;
	}
	.stats {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin: 1rem 0 0.25rem;
		font-size: 0.9rem;
		color: var(--ink-soft);
	}
	.others strong {
		color: var(--ink);
	}
	.maps {
		flex: none;
		font-weight: 600;
		color: var(--coffee);
		text-decoration: none;
	}
	.note {
		display: block;
		margin-top: 1rem;
	}
	.note > span {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--ink-soft);
	}
	textarea {
		width: 100%;
		margin-top: 0.4rem;
		border: 1.5px solid var(--line);
		border-radius: var(--r-sm);
		padding: 0.7rem;
		font: inherit;
		font-size: 0.95rem;
		resize: none;
		background: var(--bg);
		color: var(--ink);
	}
	textarea:focus {
		outline: none;
		border-color: var(--caramel);
	}
	.note small {
		display: block;
		margin-top: 0.3rem;
		color: var(--ink-faint);
		font-size: 0.75rem;
	}
	.note small.saved {
		color: var(--mint);
		font-weight: 600;
	}
	@keyframes rise {
		from {
			transform: translateY(100%);
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
			transform: rotate(-12deg) scale(2.6);
		}
		45% {
			opacity: 0.95;
			transform: rotate(-12deg) scale(0.92);
		}
		60% {
			transform: rotate(-12deg) scale(1.05);
		}
		100% {
			opacity: 0;
			transform: rotate(-12deg) scale(1);
		}
	}
</style>

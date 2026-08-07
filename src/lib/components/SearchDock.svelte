<script lang="ts">
	/**
	 * Inline search, docked above the tab bar where a thumb already is.
	 *
	 * It is a real input rather than a button that launches an overlay: focus
	 * pops the dock open, suggestions grow above it as you type, and picking one
	 * collapses it. Capping at three keeps the map visible - the point is to
	 * jump somewhere, not to browse a directory.
	 */
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { locationLabel, locationPlace } from '$lib/location';
	import CupIcon from './CupIcon.svelte';
	import { gazetteer } from '$lib/stores/gazetteer.svelte';
	import type { Place } from '$lib/types';
	import { isTyping } from '$lib/keys';

	export type Pick =
		| { kind: 'store'; id: string }
		| { kind: 'place'; bounds: [number, number, number, number] }
		| { kind: 'point'; center: [number, number] };

	let { onpick }: { onpick: (p: Pick) => void } = $props();

	const LIMIT = 3;

	let q = $state('');
	let focused = $state(false);
	let input = $state<HTMLInputElement>();

	/*
	 * Shown on the shortcut hint. Mac says Cmd, everything else says Ctrl.
	 *
	 * Kept as its own span because the pixel font has no U+2318: the glyph
	 * falls back to whatever the system has, at that font's idea of the size,
	 * and lands noticeably smaller than the K beside it. Styling it separately
	 * is the only way to match them.
	 */
	let isMac = $state(false);
	$effect(() => {
		isMac = navigator.platform?.startsWith('Mac') || /Mac/i.test(navigator.userAgent);
	});

	const term = $derived(q.trim().toLowerCase());

	/**
	 * Places rank above individual stores, and a name that starts with the term
	 * ranks above one that merely contains it - typing "toronto" should offer
	 * Toronto before a store on Toronto Street somewhere else.
	 *
	 * The context is searchable too, so "leicester uk" and "windsor nova
	 * scotia" both land.
	 */
	const placeHits = $derived.by(() => {
		if (term.length < 2) return [] as Place[];
		return locations.places
			.filter((p) => `${p.name} ${p.context}`.toLowerCase().includes(term))
			.sort((a, b) => {
				const sa = a.name.toLowerCase().startsWith(term) ? 0 : 1;
				const sb = b.name.toLowerCase().startsWith(term) ? 0 : 1;
				return sa - sb || b.count - a.count;
			})
			.slice(0, 2);
	});

	const storeHits = $derived.by(() => {
		if (term.length < 2) return [];
		const room = LIMIT - placeHits.length;
		if (room <= 0) return [];
		const out = [];
		for (const p of locations.all()) {
			// Match the map: a hidden closure should not be reachable from search
			// either, or you land on a card with no cup under it.
			if (p.closed && !settings.showClosed && !passport.isVisited(p.id)) continue;
			const hay = `${p.name} ${p.address} ${p.venue ?? ''} ${p.city} ${p.region} ${p.country}`.toLowerCase();
			if (hay.includes(term)) {
				out.push(p);
				if (out.length >= room) break;
			}
		}
		return out;
	});

	/**
	 * Only consulted when nothing in the dataset matched. A place with stores is
	 * always the better answer; this is the difference between "no results" and
	 * "here is Pittsburgh, see for yourself".
	 */
	/**
	 * Every word, anywhere, in any order - tried only when the phrase itself
	 * matched nothing.
	 *
	 * "airport saskatoon" is two facts about one store rather than a string
	 * any record contains, and a plain substring test cannot see it. Running
	 * this first would be worse, though: it would let a loose scatter of words
	 * outrank an exact phrase, so it stays a fallback.
	 */
	const looseHits = $derived.by(() => {
		if (placeHits.length + storeHits.length > 0) return { places: [] as Place[], stores: [] };
		const words = term.split(/\s+/).filter((w) => w.length >= 2);
		if (words.length < 2) return { places: [] as Place[], stores: [] };
		const hit = (hay: string) => words.every((w) => hay.includes(w));

		const places = locations.places
			.filter((p) => hit(`${p.name} ${p.context}`.toLowerCase()))
			.sort((a, b) => b.count - a.count)
			.slice(0, 2);

		const stores = [];
		const room = LIMIT - places.length;
		if (room > 0) {
			for (const p of locations.all()) {
				if (p.closed && !settings.showClosed && !passport.isVisited(p.id)) continue;
				if (hit(`${p.name} ${p.address} ${p.venue ?? ''} ${p.city} ${p.region} ${p.country}`.toLowerCase())) {
					stores.push(p);
					if (stores.length >= room) break;
				}
			}
		}
		return { places, stores };
	});

	/* What the list actually renders: the phrase match, or the loose one. */
	const shownPlaces = $derived(placeHits.length ? placeHits : looseHits.places);
	const shownStores = $derived(storeHits.length ? storeHits : looseHits.stores);

	const gazetteerHits = $derived(
		shownPlaces.length + shownStores.length > 0 ? [] : gazetteer.search(term)
	);

	const hasResults = $derived(shownPlaces.length + shownStores.length + gazetteerHits.length > 0);

	const open = $derived(focused && term.length >= 2);

	function choose(p: Pick) {
		onpick(p);
		q = '';
		input?.blur();
	}

	/*
	 * Cmd-K, or Ctrl-K away from a Mac. The convention people already have for
	 * "search this app", and it costs a keystroke instead of a reach for the
	 * pointer. Ignored while typing somewhere else, since a text field may
	 * have its own use for it, and the browser's own Ctrl-K is superseded on
	 * purpose - this page has a search box of its own.
	 */
	$effect(() => {
		const onShortcut = (e: KeyboardEvent) => {
			if (e.key !== 'k' || !(e.metaKey || e.ctrlKey) || e.altKey) return;
			if (isTyping(e.target) && e.target !== input) return;
			e.preventDefault();
			input?.focus();
			input?.select();
		};
		window.addEventListener('keydown', onShortcut);
		return () => window.removeEventListener('keydown', onShortcut);
	});

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			q = '';
			input?.blur();
		} else if (e.key === 'Enter') {
			// Enter takes the top suggestion, which is the city when one matched.
			if (shownPlaces.length) choose({ kind: 'place', bounds: shownPlaces[0].bounds });
			else if (shownStores.length) choose({ kind: 'store', id: shownStores[0].id });
		}
	}
</script>

<div class="dock">
	{#if open}
		<ul class="suggestions">
			{#each shownPlaces as p (p.key)}
				<li>
					<!-- pointerdown is swallowed so the input never loses focus
					     before the click lands. -->
					<button
						onpointerdown={(e) => e.preventDefault()}
						onclick={() => choose({ kind: 'place', bounds: p.bounds })}
					>
						<svg class="place" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							/>
							<circle cx="12" cy="10" r="2.4" fill="currentColor" />
						</svg>
						<span class="info">
							<strong>{p.name}</strong>
							<small>{p.context}</small>
						</span>
						<span class="count pixel">{p.count}</span>
					</button>
				</li>
			{/each}

			{#each shownStores as r (r.id)}
				<li>
					<button
						onpointerdown={(e) => e.preventDefault()}
						onclick={() => choose({ kind: 'store', id: r.id })}
					>
						<CupIcon
							height={26}
							collected={passport.isVisited(r.id)}
							closed={!!r.closed}
						/>
						<span class="info">
							<strong>{locationLabel(r)}</strong>
							<small>{locationPlace(r) || r.name}</small>
						</span>
					</button>
				</li>
			{/each}

			{#each gazetteerHits as g (g.name + g.context)}
				<li>
					<button
						onpointerdown={(e) => e.preventDefault()}
						onclick={() => choose({ kind: 'point', center: [g.lng, g.lat] })}
					>
						<svg class="place faint" viewBox="0 0 24 24" aria-hidden="true">
							<path
								d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
							/>
						</svg>
						<span class="info">
							<strong>{g.name}</strong>
							<small>{g.context}</small>
						</span>
						<span class="count pixel">no timmies</span>
					</button>
				</li>
			{/each}

			{#if !hasResults}
				<li class="none">Nothing matches “{q}”.</li>
			{/if}
		</ul>
	{/if}

	<div class="field" class:lit={focused}>
		<span class="caret pixel" aria-hidden="true">&gt;</span>
		<input
			bind:this={input}
			bind:value={q}
				onfocus={() => {
				focused = true;
				gazetteer.load();
			}}
			onblur={() => (focused = false)}
			onkeydown={onKeydown}
			placeholder="Search {locations.total ? locations.total.toLocaleString() : ''} Timmies"
			aria-label="Search Tim Hortons locations"
		/>
		{#if q}
			<button class="clear" aria-label="Clear search" onclick={() => (q = '')}>×</button>
		{:else}
			<!-- A shortcut nobody knows about does not get used. Pointer devices
			     only: there is no such key on a phone. -->
			{#if !focused}
				<kbd class="kbd pixel" aria-hidden="true">
					<span class:sym={isMac}>{isMac ? '\u2318' : 'Ctrl'}</span>K
				</kbd>
			{/if}
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
				<path
					d="M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z"
					fill="none"
					stroke="currentColor"
					stroke-width="2.6"
					stroke-linecap="square"
				/>
			</svg>
		{/if}
	</div>
</div>

<style>
	/* Hidden wherever there is no keyboard to press it with. */
	.kbd {
		display: none;
	}
	@media (pointer: fine) {
		.kbd {
			display: inline-flex;
			align-items: center;
			gap: 0.4em;
			flex: none;
			margin-right: 0.5rem;
			padding: 0.38rem 0.6rem;
			/* 1.5x the original 0.34rem. */
			font-size: 0.51rem;
			line-height: 1;
			color: var(--cream-faint);
			background: rgba(247, 239, 227, 0.06);
			border: 1px solid rgba(247, 239, 227, 0.14);
		}
		/*
		 * The command glyph, drawn by the system font. Scaled up and nudged so
		 * its loops match the pixel K's cap height rather than sitting small
		 * and low beside it.
		 */
		.sym {
			font-family: var(--font-sans);
			font-size: 1.45em;
			line-height: 1;
			transform: translateY(0.06em);
		}
	}

	.dock {
		order: 3;
		position: relative;
		z-index: 25;
		display: flex;
		flex-direction: column;
	}

	.field {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		min-height: 46px;
		padding: 0 0.7rem 0 0.8rem;
		color: var(--cream-dim);
		background: var(--screen-deep);
		border-top: 2px solid var(--cabinet-lo);
		box-shadow: inset 0 2px 0 rgba(247, 239, 227, 0.06);
	}
	/* The flash: a gold edge snaps on when the dock takes focus. */
	.field.lit {
		color: var(--cream);
		box-shadow: inset 0 0 0 2px var(--gold);
		animation: flash 0.18s steps(2, end);
	}
	@keyframes flash {
		0% {
			background: var(--gold);
		}
		50% {
			background: var(--screen-deep);
		}
	}

	.caret {
		flex: none;
		font-size: 0.6rem;
		color: var(--green);
	}
	input {
		flex: 1;
		min-width: 0;
		border: none;
		background: none;
		font-family: var(--font-sans);
		font-size: 0.95rem;
		color: var(--cream);
	}
	input::placeholder {
		color: var(--cream-faint);
	}
	input:focus {
		outline: none;
	}
	.clear {
		flex: none;
		width: 32px;
		height: 32px;
		font-size: 1.3rem;
		line-height: 1;
		color: var(--cream-dim);
	}
	.clear:hover {
		color: var(--cream);
	}

	/* Grows upward out of the stack rather than pushing the bar down. */
	.suggestions {
		position: absolute;
		bottom: 100%;
		left: 0;
		right: 0;
		list-style: none;
		margin: 0;
		padding: 0;
		background: var(--cabinet);
		border-top: 2px solid var(--cabinet-hi);
		box-shadow: 0 -3px 0 var(--cabinet-lo);
		transform-origin: bottom center;
		animation: pop 0.16s steps(3, end);
	}
	@keyframes pop {
		from {
			transform: scaleY(0.4);
			opacity: 0;
		}
	}
	.suggestions li button {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		width: 100%;
		min-height: 54px;
		padding: 0.55rem 0.8rem;
		text-align: left;
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.suggestions li:last-child button {
		border-bottom: none;
	}
	.suggestions li button:hover {
		background: var(--cabinet-hi);
	}
	.place {
		width: 26px;
		height: 26px;
		flex: none;
		color: var(--gold);
	}
	/* A place we can fly to, but with nothing to collect there yet. */
	.place.faint {
		color: var(--cream-faint);
	}
	.count {
		flex: none;
		font-size: 0.45rem;
		color: var(--cream-dim);
	}
	.info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}
	.info strong {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--cream);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.info small {
		color: var(--cream-dim);
		font-size: 0.78rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.none {
		padding: 1rem 0.8rem;
		text-align: center;
		font-size: 0.88rem;
		color: var(--cream-dim);
	}

	@media (min-width: 900px) {
		.dock {
			width: 420px;
		}
		.field {
			border: 2px solid var(--cabinet-lo);
			border-top-color: var(--cabinet-hi);
			border-left-color: var(--cabinet-hi);
			box-shadow: var(--bevel-md);
		}
		.suggestions {
			border: 2px solid var(--cabinet-lo);
			border-top-color: var(--cabinet-hi);
			border-left-color: var(--cabinet-hi);
			box-shadow: var(--bevel-md);
		}
	}
</style>

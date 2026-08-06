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
	import { locationLabel, locationPlace } from '$lib/location';
	import CupIcon from './CupIcon.svelte';

	let { onpick }: { onpick: (id: string) => void } = $props();

	const LIMIT = 3;

	let q = $state('');
	let focused = $state(false);
	let input = $state<HTMLInputElement>();

	const term = $derived(q.trim().toLowerCase());
	const results = $derived.by(() => {
		if (term.length < 2) return [];
		const out = [];
		for (const p of locations.all()) {
			const hay = `${p.name} ${p.address} ${p.city} ${p.region} ${p.country}`.toLowerCase();
			if (hay.includes(term)) {
				out.push(p);
				if (out.length >= LIMIT) break;
			}
		}
		return out;
	});

	const open = $derived(focused && term.length >= 2);

	function choose(id: string) {
		onpick(id);
		q = '';
		input?.blur();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			q = '';
			input?.blur();
		} else if (e.key === 'Enter' && results.length) {
			choose(results[0].id);
		}
	}
</script>

<div class="dock">
	{#if open}
		<ul class="suggestions">
			{#each results as r (r.id)}
				<li>
					<!-- pointerdown is swallowed so the input never loses focus
					     before the click lands. -->
					<button onpointerdown={(e) => e.preventDefault()} onclick={() => choose(r.id)}>
						<CupIcon
							size={24}
							outline={passport.isVisited(r.id) ? 'var(--mint)' : 'var(--tim-red)'}
							fill="var(--cream)"
						/>
						<span class="info">
							<strong>{locationLabel(r)}</strong>
							<small>{locationPlace(r) || r.name}</small>
						</span>
					</button>
				</li>
			{:else}
				<li class="none">No Timmies match “{q}”.</li>
			{/each}
		</ul>
	{/if}

	<div class="field" class:lit={focused}>
		<span class="caret pixel" aria-hidden="true">&gt;</span>
		<input
			bind:this={input}
			bind:value={q}
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
			onkeydown={onKeydown}
			placeholder="Search {locations.total ? locations.total.toLocaleString() : ''} Timmies"
			aria-label="Search Tim Hortons locations"
		/>
		{#if q}
			<button class="clear" aria-label="Clear search" onclick={() => (q = '')}>×</button>
		{:else}
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
	.dock {
		position: absolute;
		left: 0;
		right: 0;
		bottom: calc(var(--safe-bottom) + 59px);
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
		color: var(--mint);
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

	.suggestions {
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
			left: 50%;
			right: auto;
			transform: translateX(-50%);
			/* Clears the floating desktop tab bar and the ticker below it. */
			bottom: calc(var(--frame) + 100px);
			width: 360px;
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
			margin-bottom: 6px;
		}
	}
</style>

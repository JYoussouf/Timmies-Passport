<script lang="ts">
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { fly, fade } from 'svelte/transition';
	import type { LocationProps } from '$lib/types';

	let { open = $bindable(false), onpick }: { open: boolean; onpick: (id: string) => void } =
		$props();

	let q = $state('');
	let input = $state<HTMLInputElement>();

	const results = $derived.by(() => {
		const term = q.trim().toLowerCase();
		if (term.length < 2) return [] as LocationProps[];
		const out: LocationProps[] = [];
		for (const p of locations.all()) {
			const hay = `${p.name} ${p.address} ${p.city} ${p.region} ${p.country}`.toLowerCase();
			if (hay.includes(term)) {
				out.push(p);
				if (out.length >= 40) break;
			}
		}
		return out;
	});

	$effect(() => {
		if (open) setTimeout(() => input?.focus(), 50);
		else q = '';
	});

	function pick(id: string) {
		onpick(id);
		open = false;
	}
</script>

{#if open}
	<div class="wrap" transition:fade={{ duration: 140 }}>
		<button class="scrim" aria-label="Close search" onclick={() => (open = false)}></button>
		<div class="panel" transition:fly={{ y: -12, duration: 200 }}>
			<div class="field">
				<span class="caret pixel" aria-hidden="true">&gt;</span>
				<input
					bind:this={input}
					bind:value={q}
					placeholder="Search a city, region, or Timmies"
					aria-label="Search locations"
				/>
				<button class="close pixel" onclick={() => (open = false)}>Esc</button>
			</div>

			{#if q.trim().length >= 2}
				<ul class="results">
					{#each results as r (r.id)}
						<li>
							<button onclick={() => pick(r.id)}>
								<span class="pin" class:done={passport.isVisited(r.id)}></span>
								<!--
									Lead with the street address: every result is called
									"Tim Hortons", so the city alone makes a page of
									identical-looking rows.
								-->
								<span class="info">
									<strong>{r.address || r.name}</strong>
									<small
										>{[r.city, r.region, r.country].filter(Boolean).join(', ') ||
											'Tim Hortons'}</small
									>
								</span>
								{#if passport.isVisited(r.id)}<span class="tick pixel">OK</span>{/if}
							</button>
						</li>
					{:else}
						<li class="empty">No Timmies match “{q}”.</li>
					{/each}
				</ul>
			{:else}
				<p class="hint">
					Type at least two letters to search {locations.total.toLocaleString()} locations.
				</p>
			{/if}
		</div>
	</div>
{/if}

<style>
	.wrap {
		position: fixed;
		inset: 0;
		z-index: 65;
		display: flex;
		justify-content: center;
	}
	.scrim {
		position: absolute;
		inset: 0;
		background: rgba(11, 21, 36, 0.72);
		border: none;
	}
	.panel {
		position: relative;
		margin-top: calc(var(--safe-top) + 12px);
		width: min(560px, calc(100vw - 20px));
		max-height: 80dvh;
		display: flex;
		flex-direction: column;
		background: var(--cabinet);
		border-top: 3px solid var(--cabinet-hi);
		border-left: 3px solid var(--cabinet-hi);
		border-right: 3px solid var(--cabinet-lo);
		border-bottom: 3px solid var(--cabinet-lo);
		box-shadow: var(--bevel-lg);
		overflow: hidden;
	}
	.field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 0.6rem 0.6rem 0.75rem;
		background: var(--screen-deep);
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.caret {
		font-size: 0.6rem;
		color: var(--mint);
		animation: blink 1s steps(2, end) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0.25;
		}
	}
	.field input {
		flex: 1;
		min-width: 0;
		min-height: 32px;
		border: none;
		background: none;
		font-family: var(--font-sans);
		font-size: 1rem;
		color: var(--cream);
	}
	.field input::placeholder {
		color: var(--cream-faint);
	}
	.field input:focus {
		outline: none;
	}
	.close {
		flex: none;
		min-height: 36px;
		padding: 0 0.65rem;
		font-size: 0.45rem;
		color: var(--cream-dim);
		background: var(--surface-2);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.results {
		list-style: none;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
	}
	.results li button {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		width: 100%;
		min-height: 52px;
		padding: 0.6rem 0.75rem;
		text-align: left;
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.results li button:hover {
		background: var(--cabinet-hi);
	}
	.pin {
		flex: none;
		width: 12px;
		height: 12px;
		background: transparent;
		box-shadow: inset 0 0 0 3px var(--tim-red);
	}
	.pin.done {
		box-shadow: inset 0 0 0 3px var(--mint), inset 0 0 0 6px var(--mint);
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
	}
	.info small {
		color: var(--cream-dim);
		font-size: 0.8rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tick {
		flex: none;
		font-size: 0.4rem;
		color: var(--mint);
	}
	.hint,
	.empty {
		padding: 1.2rem;
		color: var(--cream-dim);
		font-size: 0.9rem;
		text-align: center;
	}
</style>

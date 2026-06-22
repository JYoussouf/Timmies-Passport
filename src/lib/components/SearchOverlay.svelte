<script lang="ts">
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { ui } from '$lib/stores/ui.svelte';
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
		for (const p of locations.index.values()) {
			const hay = `${p.name} ${p.city} ${p.region} ${p.country}`.toLowerCase();
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
	<div class="wrap" transition:fade={{ duration: 160 }}>
		<button class="scrim" aria-label="Close search" onclick={() => (open = false)}></button>
		<div class="panel" transition:fly={{ y: -16, duration: 240 }}>
			<div class="field">
				<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"
					><path
						d="M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z"
						fill="none"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
					/></svg
				>
				<input
					bind:this={input}
					bind:value={q}
					placeholder="Search a city, region, or Timmies…"
					aria-label="Search locations"
				/>
				<button class="close" onclick={() => (open = false)}>Cancel</button>
			</div>

			{#if q.trim().length >= 2}
				<ul class="results">
					{#each results as r (r.id)}
						<li>
							<button onclick={() => pick(r.id)}>
								<span class="pin" class:done={passport.isVisited(r.id)}></span>
								<span class="info">
									<strong>{r.name}</strong>
									<small>{[r.city, r.region, r.country].filter(Boolean).join(', ') || 'Tim Hortons'}</small>
								</span>
								{#if passport.isVisited(r.id)}<span class="tick">✓</span>{/if}
							</button>
						</li>
					{:else}
						<li class="empty">No Timmies match “{q}”.</li>
					{/each}
				</ul>
			{:else}
				<p class="hint">Type at least two letters to search {locations.total.toLocaleString()} locations.</p>
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
		background: rgba(43, 26, 20, 0.4);
		backdrop-filter: blur(3px);
		border: none;
	}
	.panel {
		position: relative;
		margin-top: calc(var(--safe-top) + 12px);
		width: min(560px, calc(100vw - 20px));
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		background: var(--surface);
		border-radius: var(--r-lg);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
	}
	.field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 0.85rem;
		border-bottom: 1px solid var(--line);
		color: var(--ink-faint);
	}
	.field input {
		flex: 1;
		border: none;
		background: none;
		font: inherit;
		font-size: 1rem;
		color: var(--ink);
	}
	.field input:focus {
		outline: none;
	}
	.close {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--accent);
	}
	.results {
		list-style: none;
		margin: 0;
		padding: 0.4rem;
		overflow-y: auto;
	}
	.results li button {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		width: 100%;
		padding: 0.6rem 0.6rem;
		border-radius: var(--r-sm);
		text-align: left;
	}
	.results li button:hover {
		background: var(--surface-2);
	}
	.pin {
		flex: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 2.5px solid var(--caramel);
		background: var(--surface);
	}
	.pin.done {
		background: var(--accent);
		border-color: var(--accent);
	}
	.info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}
	.info strong {
		font-size: 0.92rem;
	}
	.info small {
		color: var(--ink-soft);
		font-size: 0.8rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tick {
		color: var(--mint);
		font-weight: 800;
	}
	.hint,
	.empty {
		padding: 1.1rem;
		color: var(--ink-faint);
		font-size: 0.9rem;
		text-align: center;
	}
</style>

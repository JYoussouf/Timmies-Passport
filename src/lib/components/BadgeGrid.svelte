<script lang="ts">
	import { passport } from '$lib/stores/passport.svelte';
	const badges = $derived(passport.badges);
	/** Progress meters read as discrete segments, never a smooth bar. */
	const SEGMENTS = 8;
	const segs = Array.from({ length: SEGMENTS }, (_, i) => i);
</script>

<div class="grid">
	{#each badges as b (b.id)}
		<div class="plaque" class:earned={b.earned} title={b.description}>
			<div class="face">
				<span class="emoji">{b.emoji}</span>
			</div>
			<strong class="pixel">{b.label}</strong>
			{#if b.earned}
				<small class="got pixel">Earned</small>
			{:else}
				<span class="meter" aria-hidden="true">
					{#each segs as i (i)}
						<i class:on={i < Math.round(b.progress * SEGMENTS)}></i>
					{/each}
				</span>
				<small>{b.description}</small>
			{/if}
		</div>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
		gap: 0.6rem;
	}
	.plaque {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.4rem;
		padding: 0.85rem 0.5rem;
		background: var(--cabinet);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-sm);
	}
	.face {
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		background: var(--screen-deep);
		border: 2px solid var(--cabinet-lo);
	}
	.plaque.earned .face {
		background: var(--gold);
		border-color: var(--gold-deep);
		box-shadow: inset 2px 2px 0 #ffd479;
	}
	.emoji {
		font-size: 1.35rem;
		filter: grayscale(1) opacity(0.55);
	}
	.plaque.earned .emoji {
		filter: none;
	}
	strong {
		font-size: 0.45rem;
		line-height: 1.5;
		color: var(--cream-dim);
	}
	.plaque.earned strong {
		color: var(--gold);
	}
	.meter {
		display: flex;
		gap: 2px;
	}
	.meter i {
		width: 5px;
		height: 6px;
		background: rgba(247, 239, 227, 0.14);
	}
	.meter i.on {
		background: var(--mint);
	}
	small {
		font-size: 0.7rem;
		line-height: 1.3;
		color: var(--cream-dim);
	}
	small.got {
		font-size: 0.4rem;
		color: var(--mint);
	}
</style>

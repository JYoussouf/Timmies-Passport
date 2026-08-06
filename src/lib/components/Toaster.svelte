<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import { fly } from 'svelte/transition';
</script>

<div class="toaster" aria-live="polite">
	{#each ui.toasts as t (t.id)}
		<div class="toast" transition:fly={{ y: 20, duration: 240 }}>
			<span class="emoji" aria-hidden="true">{t.emoji}</span>
			<div class="body">
				<strong class="pixel">{t.title}</strong>
				{#if t.body}<span>{t.body}</span>{/if}
			</div>
			{#if t.action}
				<button
					class="act pixel"
					onclick={() => {
						t.action!.run();
						ui.dismiss(t.id);
					}}>{t.action.label}</button
				>
			{/if}
			<button class="x" aria-label="Dismiss" onclick={() => ui.dismiss(t.id)}>×</button>
		</div>
	{/each}
</div>

<style>
	.toaster {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		top: calc(var(--safe-top) + 66px);
		z-index: 60;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: min(420px, calc(100vw - 24px));
		pointer-events: none;
	}
	.toast {
		pointer-events: auto;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		background: var(--screen-deep);
		color: var(--cream);
		padding: 0.65rem 0.5rem 0.65rem 0.75rem;
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md);
	}
	.emoji {
		font-size: 1.3rem;
		flex: none;
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: 3px;
		flex: 1;
		min-width: 0;
	}
	.body strong {
		font-size: 0.5rem;
		color: var(--gold);
	}
	.body span {
		font-size: 0.8rem;
		line-height: 1.35;
		color: var(--cream-dim);
	}
	.act {
		flex: none;
		align-self: stretch;
		font-size: 0.45rem;
		color: var(--cabinet-lo);
		background: var(--gold);
		padding: 0 0.6rem;
		border-top: 2px solid #ffd479;
		border-left: 2px solid #ffd479;
		border-right: 2px solid var(--gold-deep);
		border-bottom: 2px solid var(--gold-deep);
	}
	.act:active {
		transform: translate(2px, 2px);
	}
	.x {
		flex: none;
		width: 32px;
		height: 32px;
		font-size: 1.2rem;
		line-height: 1;
		color: var(--cream-dim);
	}
	.x:hover {
		color: var(--cream);
	}
</style>

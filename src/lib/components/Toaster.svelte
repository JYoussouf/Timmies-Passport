<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import { fly } from 'svelte/transition';
</script>

<div class="toaster" aria-live="polite">
	{#each ui.toasts as t (t.id)}
		<div class="toast" transition:fly={{ y: 24, duration: 320 }}>
			<span class="emoji" aria-hidden="true">{t.emoji}</span>
			<div class="body">
				<strong>{t.title}</strong>
				{#if t.body}<span>{t.body}</span>{/if}
			</div>
			{#if t.action}
				<button
					class="act"
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
		top: calc(var(--safe-top) + 12px);
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
		background: var(--espresso);
		color: var(--cream);
		padding: 0.7rem 0.8rem 0.7rem 0.9rem;
		border-radius: var(--r-md);
		box-shadow: var(--shadow-lg);
	}
	.emoji {
		font-size: 1.35rem;
	}
	.body {
		display: flex;
		flex-direction: column;
		line-height: 1.25;
		flex: 1;
		min-width: 0;
	}
	.body strong {
		font-size: 0.92rem;
	}
	.body span {
		font-size: 0.82rem;
		opacity: 0.82;
	}
	.act {
		flex: none;
		font-weight: 700;
		font-size: 0.85rem;
		color: #fff;
		background: var(--accent);
		padding: 0.45rem 0.8rem;
		border-radius: 999px;
	}
	.x {
		flex: none;
		font-size: 1.3rem;
		line-height: 1;
		color: var(--cream);
		opacity: 0.6;
		padding: 0 0.2rem;
	}
	.x:hover {
		opacity: 1;
	}
</style>

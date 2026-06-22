<script lang="ts">
	import { passport } from '$lib/stores/passport.svelte';
	const badges = $derived(passport.badges);
</script>

<div class="grid">
	{#each badges as b (b.id)}
		<div class="badge" class:earned={b.earned} title={b.description}>
			<div class="medallion">
				<span class="emoji">{b.emoji}</span>
				{#if !b.earned}
					<svg class="ring" viewBox="0 0 44 44" aria-hidden="true">
						<circle class="track" cx="22" cy="22" r="20" />
						<circle
							class="fill"
							cx="22"
							cy="22"
							r="20"
							style="stroke-dashoffset: {125.6 - 125.6 * b.progress}"
						/>
					</svg>
				{/if}
			</div>
			<strong>{b.label}</strong>
			<small>{b.earned ? 'Earned' : b.description}</small>
		</div>
	{/each}
</div>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(102px, 1fr));
		gap: 0.75rem;
	}
	.badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		gap: 0.3rem;
		padding: 0.9rem 0.5rem;
		border-radius: var(--r-md);
		background: var(--surface);
		border: 1px solid var(--line);
		opacity: 0.62;
		transition: transform 0.2s var(--ease-spring);
	}
	.badge.earned {
		opacity: 1;
		background: linear-gradient(160deg, #fff6e9, var(--surface));
		border-color: rgba(176, 122, 79, 0.4);
		box-shadow: var(--shadow-sm);
	}
	.medallion {
		position: relative;
		width: 52px;
		height: 52px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--surface-2);
		margin-bottom: 0.2rem;
	}
	.badge.earned .medallion {
		background: radial-gradient(circle at 50% 35%, #ffe9c2, #e6b878);
		box-shadow: inset 0 0 0 2px rgba(176, 122, 79, 0.5);
	}
	.emoji {
		font-size: 1.5rem;
		filter: grayscale(0.7);
	}
	.badge.earned .emoji {
		filter: none;
	}
	.ring {
		position: absolute;
		inset: -3px;
		transform: rotate(-90deg);
	}
	.ring .track {
		fill: none;
		stroke: rgba(43, 26, 20, 0.08);
		stroke-width: 3;
	}
	.ring .fill {
		fill: none;
		stroke: var(--caramel);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-dasharray: 125.6;
		transition: stroke-dashoffset 0.6s var(--ease-out);
	}
	strong {
		font-size: 0.82rem;
		line-height: 1.1;
	}
	small {
		font-size: 0.68rem;
		color: var(--ink-soft);
		line-height: 1.2;
	}
</style>

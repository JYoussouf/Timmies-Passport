<script lang="ts">
	/**
	 * The expanded share view: the finished card full-size on a near-opaque
	 * scrim, with the share chips beneath it. Rendering and sharing both live
	 * in $lib/share/shareCard - this component only presents them.
	 */
	import { fade, scale } from 'svelte/transition';
	import { shareModal } from '$lib/stores/shareModal.svelte';
	import { renderShareCard, shareTextOnly, type ShareCard } from '$lib/share/shareCard';
	import ShareChips from './ShareChips.svelte';

	type Status = 'rendering' | 'ready' | 'error';

	let status = $state<Status>('rendering');
	let card = $state<ShareCard | null>(null);

	$effect(() => {
		if (!shareModal.open) return;
		status = 'rendering';
		card = null;
		renderShareCard().then((result) => {
			if (!shareModal.open) return;
			card = result;
			status = result ? 'ready' : 'error';
		});
	});

	function close() {
		shareModal.close();
	}

	async function textFallback() {
		if (await shareTextOnly()) shareModal.close();
	}
</script>

{#if shareModal.open}
	<div class="overlay" transition:fade={{ duration: 160 }}>
		<button class="scrim" aria-label="Close" onclick={close}></button>

		<div class="top pixel">
			<span>Share</span>
			<button class="x" aria-label="Close" onclick={close}>×</button>
		</div>

		<div class="stage" transition:scale={{ start: 0.96, duration: 200 }}>
			{#if status === 'rendering'}
				<div class="state">
					<span class="spinner"></span>
					<p>Rendering your passport…</p>
				</div>
			{:else if status === 'error'}
				<div class="state">
					<p>Could not render your passport.</p>
					<button class="pbtn" onclick={textFallback}> Share text instead </button>
				</div>
			{:else if card}
				<img src={card.url} alt="My Timmies Passport journey map" />

				<div class="chips" transition:fade={{ duration: 150 }}>
					<ShareChips blob={card.blob} onshared={() => shareModal.close()} />
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 75;
		display: grid;
		place-items: center;
		padding: 1rem;
	}

	.scrim {
		position: absolute;
		inset: 0;
		background: rgba(11, 21, 36, 0.97);
		border: none;
	}

	/* No window around the artwork: a floating title row, the image itself,
	   and the chips beneath it. */
	.top {
		position: absolute;
		top: calc(var(--safe-top, 0px) + 0.8rem);
		left: 0;
		right: 0;

		display: flex;
		align-items: center;
		justify-content: space-between;

		padding: 0 1rem 0 1.2rem;

		font-size: 0.85rem;
		color: var(--gold);
	}

	.x {
		width: 40px;
		height: 40px;

		font-size: 1.6rem;
		line-height: 1;

		color: var(--cream-dim);
	}

	.x:hover {
		color: var(--cream);
	}

	.stage {
		position: relative;

		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.stage img {
		display: block;

		max-width: min(92vw, 720px);
		max-height: calc(100dvh - 11rem);

		width: auto;
		height: auto;

		border-radius: 6px;

		box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55);
	}

	.chips {
		margin-top: 0.9rem;
	}

	.state {
		margin: auto;

		padding: 2.2rem 1.4rem;

		display: flex;
		flex-direction: column;
		align-items: center;

		gap: 0.9rem;

		text-align: center;

		color: var(--cream-dim);

		font-size: 0.9rem;
	}

	.spinner {
		width: 26px;
		height: 26px;

		border: 3px solid rgba(247, 239, 227, 0.2);

		border-top-color: var(--gold);

		border-radius: 50%;

		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
	}
</style>

<script lang="ts">
	/**
	 * The share flow: preview the actual image before it goes anywhere, then
	 * one button hands it to the OS share sheet - X, LinkedIn, Instagram,
	 * Messages, whatever is installed. A blind "share" that nobody gets to
	 * look at first is how you end up posting an image you didn't mean to.
	 */
	import { fade, scale } from 'svelte/transition';
	import { shareModal } from '$lib/stores/shareModal.svelte';
	import { renderPassportImage, passportStats } from '$lib/share/passportImage';
	import { APP_NAME, SITE_URL } from '$lib/brand';
	import { ui } from '$lib/stores/ui.svelte';

	type Status = 'rendering' | 'ready' | 'error';
	let status = $state<Status>('rendering');
	let imageUrl = $state('');
	let blob: Blob | null = null;
	let sharing = $state(false);

	const stats = $derived(passportStats());

	/** "I've been to 56 out of 5,164 Timmies around the world..." */
	const shareText = $derived(
		`I've been to ${stats.count.toLocaleString()} out of ${stats.total.toLocaleString()} Timmies around the world. What about you? ${SITE_URL}`
	);

	$effect(() => {
		if (!shareModal.open) return;
		status = 'rendering';
		imageUrl = '';
		blob = null;
		const s = stats;
		renderPassportImage(s).then((result) => {
			if (!shareModal.open) return;
			if (result) {
				blob = result;
				imageUrl = URL.createObjectURL(result);
				status = 'ready';
			} else {
				status = 'error';
			}
		});
		return () => {
			if (imageUrl) URL.revokeObjectURL(imageUrl);
		};
	});

	function close() {
		if (sharing) return;
		shareModal.close();
	}

	async function shareIt() {
		sharing = true;
		const canShare = typeof navigator.share === 'function';
		try {
			if (blob && canShare) {
				const file = new File([blob], 'my-timmies-passport.png', { type: 'image/png' });
				// canShare is only ever consulted alongside share itself - a
				// browser exposing one without the other is not a real
				// combination, but the check should not assume that pairing
				// holds rather than confirm it.
				const canShareFile =
					typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
				if (canShareFile) {
					await navigator.share({
						files: [file],
						title: APP_NAME,
						text: shareText
					});
					shareModal.close();
					return;
				}
			}
			if (canShare) {
				await navigator.share({ title: APP_NAME, text: shareText, url: SITE_URL });
				shareModal.close();
				return;
			}
			// No Web Share API at all - almost always desktop. The image and the
			// caption both still need to get out, just by hand instead.
			if (blob) downloadBlob(blob);
			await navigator.clipboard?.writeText(shareText);
			ui.toast({
				emoji: '📋',
				title: blob ? 'Image downloaded' : 'Copied!',
				body: blob ? 'Caption copied - attach the image you just downloaded.' : 'Share text is on your clipboard.'
			});
			shareModal.close();
		} catch (err) {
			// AbortError: the visitor opened the share sheet and backed out of it -
			// not a failure, and not something to explain to them.
			if ((err as Error)?.name !== 'AbortError') {
				ui.toast({ emoji: '⚠️', title: 'Could not share', body: 'Try again in a moment.' });
			}
		} finally {
			sharing = false;
		}
	}

	function downloadBlob(b: Blob) {
		const url = URL.createObjectURL(b);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'my-timmies-passport.png';
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 4000);
	}
</script>

{#if shareModal.open}
	<div class="overlay" transition:fade={{ duration: 160 }}>
		<button class="scrim" aria-label="Close" onclick={close}></button>
		<div class="modal" transition:scale={{ start: 0.96, duration: 200 }}>
			<div class="cap pixel">
				Share
				<button class="x" aria-label="Close" onclick={close}>×</button>
			</div>

			<div class="preview">
				{#if status === 'rendering'}
					<div class="state">
						<span class="spinner" aria-hidden="true"></span>
						<p>Rendering your passport…</p>
					</div>
				{:else if status === 'error'}
					<div class="state">
						<p>Could not render the image on this device.</p>
						<button class="pbtn" onclick={shareIt}>Share the text instead</button>
					</div>
				{:else}
					<img src={imageUrl} alt="A map of every Tim Hortons you've stamped, with your progress." />
				{/if}
			</div>

			{#if status !== 'rendering'}
				<button
					class="pbtn pbtn-gold go"
					onclick={shareIt}
					disabled={sharing}
					transition:fade={{ duration: 150 }}
				>
					{sharing ? 'Sharing…' : 'Share this passport'}
				</button>
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
		background: rgba(11, 21, 36, 0.8);
		border: none;
	}
	.modal {
		position: relative;
		width: min(560px, 100%);
		max-height: calc(100dvh - 2rem);
		display: flex;
		flex-direction: column;
		background: var(--cabinet);
		border-top: 3px solid var(--cabinet-hi);
		border-left: 3px solid var(--cabinet-hi);
		border-right: 3px solid var(--cabinet-lo);
		border-bottom: 3px solid var(--cabinet-lo);
		box-shadow: var(--bevel-lg);
	}
	.cap {
		flex: none;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.65rem 0.65rem 0.65rem 0.9rem;
		font-size: 0.45rem;
		color: var(--gold);
		background: var(--screen-deep);
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.x {
		width: 28px;
		height: 28px;
		font-size: 1.1rem;
		line-height: 1;
		color: var(--cream-dim);
	}
	.x:hover {
		color: var(--cream);
	}

	.preview {
		position: relative;
		flex: 1;
		min-height: 220px;
		display: flex;
		overflow: auto;
		background: var(--void);
	}
	.preview img {
		display: block;
		width: 100%;
		height: auto;
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

	/*
	 * Bottom right, the same shape and weight as the check-in button - this is
	 * the other place in the app where one press commits to something, and it
	 * reads as one family of action because of it.
	 */
	.go {
		align-self: flex-end;
		margin: 0.8rem;
		padding: 0.85rem 1.3rem;
		font-size: 0.6rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
	}
</style>

<script lang="ts">
	/**
	 * A one-line nudge that the map zooms, shown until the visitor has zoomed.
	 *
	 * Deliberately not remembered between visits. Someone arriving on a link
	 * six months later is a first-time user again as far as this map is
	 * concerned, and the hint costs a corner of screen for a few seconds.
	 *
	 * It never takes a click - pointer-events are off throughout - so it cannot
	 * become one more thing in the way of the map it is describing.
	 */
	import { fade } from 'svelte/transition';

	let { done = false }: { done?: boolean } = $props();

	/*
	 * A beat before appearing. Arriving at the same moment as the map makes it
	 * one more thing moving on a screen that is already assembling itself, and
	 * anyone who starts zooming immediately never needs to see it at all.
	 */
	let ready = $state(false);
	$effect(() => {
		const t = setTimeout(() => (ready = true), 1200);
		return () => clearTimeout(t);
	});
</script>

{#if ready && !done}
	<div class="hint" role="status" transition:fade={{ duration: 260 }}>
		<div class="glyphs" aria-hidden="true">
			<!-- A mouse, wheel picked out in the middle. -->
			<svg class="glyph mouse" viewBox="0 0 24 24">
				<rect x="7" y="2.5" width="10" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="2" />
				<line x1="12" y1="6.5" x2="12" y2="10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
			</svg>
			<!--
				The pinching hand, filled rather than outlined. An outlined hand
				turns to mush once it is small; a silhouette keeps its shape,
				which is why every gesture icon set draws it this way. The two
				discs are the contact points, held clear of the fingertips so
				they read as taps rather than as part of the hand.
			-->
			<svg class="glyph pinch" viewBox="0 0 24 24" fill="currentColor">
				<circle cx="10.6" cy="3" r="2.4" />
				<circle cx="3.2" cy="9.1" r="2.4" />
				<!-- Index, then two fingers behind it, then the palm they join. -->
				<rect x="9.1" y="6.4" width="3" height="10" rx="1.5" />
				<rect x="12.4" y="9" width="2.8" height="7.4" rx="1.4" />
				<rect x="15.5" y="10.4" width="2.8" height="6" rx="1.4" />
				<path d="M9.6 16.4h8.7v2.6a3.6 3.6 0 0 1-3.6 3.6h-3.2a5 5 0 0 1-3.5-1.5l-3.1-3.1a1.7 1.7 0 0 1 2.4-2.4z" />
				<!-- The thumb, reaching its own contact point. -->
				<path
					d="M8.9 16.6L4.6 11.4"
					fill="none"
					stroke="currentColor"
					stroke-width="3.2"
					stroke-linecap="round"
				/>
			</svg>
		</div>
		<span class="text pixel">Scroll or pinch to zoom</span>
	</div>
{/if}

<style>
	.hint {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.95rem;
		/* Never a click target: it describes the map, it does not sit on it. */
		pointer-events: none;
		color: var(--cream-dim);
		background: rgba(11, 21, 36, 0.72);
		border: 2px solid rgba(247, 239, 227, 0.14);
	}

	/* One box, two glyphs stacked in it, so the swap does not shift the text. */
	.glyphs {
		position: relative;
		flex: none;
		width: 28px;
		height: 28px;
		color: var(--gold);
	}
	.glyph {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.mouse {
		animation: swap 4s ease-in-out infinite;
	}
	.pinch {
		animation: swap 4s ease-in-out infinite reverse;
	}
	/* Each is opaque for its half of the cycle, with a short cross-fade. */
	@keyframes swap {
		0%,
		42% {
			opacity: 1;
		}
		58%,
		100% {
			opacity: 0;
		}
	}

	.text {
		font-size: 0.34rem;
		line-height: 1.6;
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.mouse,
		.pinch {
			animation-duration: 0s;
		}
		.pinch {
			opacity: 0;
		}
	}
</style>

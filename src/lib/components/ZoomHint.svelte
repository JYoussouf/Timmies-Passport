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
			<!--
				A mouse, wheel picked out in the middle. Its stroke is set to
				land at the same width on screen as the drawn hand's - 0.84 in
				a 24-unit box against the hand's 0.98 css px in a 28px one. The
				hand is fine line art and cannot be thickened to meet a chunky
				outline without its fingers merging, so the outline came down
				to meet it instead. Both scale with the glyph box, so they stay
				matched at the smaller desktop size too.
			-->
			<svg class="glyph mouse" viewBox="0 0 24 24">
				<rect x="7" y="2.5" width="10" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="0.84" />
				<line x1="12" y1="6.5" x2="12" y2="10.5" stroke="currentColor" stroke-width="0.84" stroke-linecap="round" />
			</svg>
			<!--
				Joe's own drawing, recoloured to gold and keyed off its darkness
				so the white fill and the checkerboard it was drawn on both drop
				out. Line art rather than a silhouette, which is why it survives
				at this size where an outlined hand of my own did not.
			-->
			<img class="glyph pinch" src="/art/pinch-gesture.png" alt="" />
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
		/* The hand is taller than it is wide; letterbox rather than squash. */
		object-fit: contain;
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

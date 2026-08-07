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
				land at the same width on screen as the drawn hand's - 1.35 in
				a 24-unit box against the hand's measured 2.25 css px in a 40px
				one. Both scale with the glyph box, so they stay matched at the
				smaller desktop size too.
			-->
			<svg class="glyph mouse" viewBox="0 0 24 24">
				<rect x="7" y="2.5" width="10" height="19" rx="5" fill="none" stroke="currentColor" stroke-width="1.35" />
				<line x1="12" y1="6.5" x2="12" y2="10.5" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" />
			</svg>
			<!--
				Joe's own drawing, recoloured to gold and keyed off its darkness
				so the white fill and the checkerboard it was drawn on both drop
				out. Line art rather than a silhouette, which is why it survives
				shrunk down - but the two touch rings are each a tight double
				curve, and that detail needs real screen space to stay two
				circles rather than blur into one. The glyph box is sized for
				that, not just for legibility of the hand as a whole.
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

	/*
	 * One box, two glyphs stacked in it, so the swap does not shift the text.
	 * Sized for the hand, not the mouse: the drawing's two touch rings are
	 * each a tight nested curve, and at the old 28px they blurred into one -
	 * the mistake that prompted this. Verified at true device pixel density,
	 * not a magnified screenshot, which is what hid the problem the first
	 * time.
	 */
	.glyphs {
		position: relative;
		flex: none;
		width: 40px;
		height: 40px;
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
	/*
	 * Both glyphs run the same animation, offset by half its period, so each
	 * one's fade-out lands exactly on the other's fade-in. The earlier version
	 * played one copy in reverse instead, which mirrored the keyframes' one
	 * flaw: they faded 1 to 0 mid-cycle but jumped from 0 back to 1 at the
	 * loop boundary, so the mouse-to-pinch handoff cross-faded while the
	 * pinch-to-mouse one snapped. These keyframes fade in both directions and
	 * end where they begin, so there is no boundary left to jump at.
	 */
	.mouse {
		animation: swap 4s ease-in-out infinite;
	}
	.pinch {
		animation: swap 4s ease-in-out infinite;
		animation-delay: -2s;
	}
	@keyframes swap {
		0%,
		38% {
			opacity: 1;
		}
		50%,
		88% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}

	.text {
		font-size: 0.4rem;
		line-height: 1.6;
		white-space: nowrap;
	}

	/* Desktop sits further from the eye but on a sharper display; the rings
	   hold up at a smaller box there than they do on a typical phone. */
	@media (min-width: 900px) {
		.glyphs {
			width: 30px;
			height: 30px;
		}
		.text {
			font-size: 0.32rem;
		}
	}

	/* No swap at all: a static mouse icon. `animation: none` rather than a
	   zero duration, which interacts badly with the pinch's negative delay. */
	@media (prefers-reduced-motion: reduce) {
		.mouse,
		.pinch {
			animation: none;
		}
		.pinch {
			opacity: 0;
		}
	}
</style>

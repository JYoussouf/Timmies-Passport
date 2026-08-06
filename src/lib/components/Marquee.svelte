<script lang="ts">
	/** Bottom ticker. Recent stamps, or a prompt when the passport is empty. */
	import { passport } from '$lib/stores/passport.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { locationLabel, locationPlace } from '$lib/location';

	const items = $derived.by(() => {
		const recent = passport.timeline.slice(0, 8).map((t) => {
			const l = locations.get(t.id);
			const where = locationPlace(l);
			return `★ Stamped ${locationLabel(l)}${where ? `, ${where}` : ''}`;
		});
		if (recent.length === 0) {
			return [
				'★ Tap any cup to check in',
				'★ Collect every Timmies on Earth',
				'★ Your stamps live on this device until you sign up'
			];
		}
		return [...recent, `★ ${passport.count} stamps collected - share your passport`];
	});

	// Repeat the strip so the loop has no visible seam.
	const text = $derived(items.join('  '));

	/**
	 * Pixels per second, rather than a fixed duration for the whole loop.
	 *
	 * With a fixed duration the speed depends on how much text there is, so the
	 * ticker quietly sped up as a passport filled with stamps. Deriving the
	 * duration from the measured width holds one pace forever.
	 */
	const SPEED = 18;

	let track = $state<HTMLDivElement>();
	let duration = $state(90);

	$effect(() => {
		if (!track) return;
		void text; // remeasure when the contents change
		const measure = () => {
			if (track?.offsetWidth) duration = track.offsetWidth / SPEED;
		};
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(track);
		return () => ro.disconnect();
	});

</script>

<div class="marquee" aria-hidden="true">
	<div class="track" bind:this={track} style="animation-duration: {duration}s">
		<span class="pixel">{text}</span>
		<span class="pixel">{text}</span>
	</div>
</div>

<style>
	.marquee {
		order: 2;
		height: 28px;
		display: flex;
		align-items: center;
		overflow: hidden;
		background: var(--screen-deep);
		border-top: 2px solid var(--cabinet-lo);
		box-shadow: inset 0 2px 0 rgba(247, 239, 227, 0.06);
	}
	.track {
		display: flex;
		flex: none;
		gap: 3rem;
		padding-left: 100%;
		/* Duration is set inline from the measured width; see SPEED above. */
		animation: scroll 60s linear infinite;
	}
	.track span {
		flex: none;
		white-space: nowrap;
		font-size: 0.5rem;
		line-height: 1;
		color: var(--gold);
	}
	@keyframes scroll {
		to {
			transform: translateX(-100%);
		}
	}

	@media (min-width: 900px) {
		.marquee {
			order: 3;
			height: 32px;
		}
		.track span {
			font-size: 0.56rem;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.track {
			padding-left: 0.9rem;
			animation: none;
		}
	}
</style>

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
</script>

<div class="marquee" aria-hidden="true">
	<div class="track">
		<span class="pixel">{text}</span>
		<span class="pixel">{text}</span>
	</div>
</div>

<style>
	.marquee {
		position: absolute;
		left: 0;
		right: 0;
		/* Sits directly on top of the full-width mobile tab bar. */
		bottom: calc(var(--safe-bottom) + 105px);
		z-index: 18;
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
		animation: scroll 42s linear infinite;
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
			/* Desktop floats the nav and search above the ticker. */
			bottom: 0;
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

<script lang="ts">
	/**
	 * Desktop-only stats rail.
	 *
	 * It does not repeat the stamped count - that is the HUD plate's job - and
	 * it is not rendered on mobile at all, where those chips would just crowd a
	 * 390px row with numbers the HUD and Passport tab already show.
	 */
	import { passport } from '$lib/stores/passport.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import CupIcon from './CupIcon.svelte';

	const remaining = $derived(Math.max(0, locations.total - passport.count));
	const countries = $derived(passport.countriesVisited.size);
</script>

<div class="legend">
	<span class="chip">
		<CupIcon height={14} />
		To go <strong>{remaining.toLocaleString()}</strong>
	</span>
	<span class="chip">
		<CupIcon height={14} collected />
		Countries <strong>{countries}</strong>
	</span>
</div>

<style>
	.legend {
		display: none;
	}

	@media (min-width: 900px) {
		/*
		 * Below the top bar, which starts at --safe-top. Measuring from the
		 * viewport instead only worked while that inset was zero: anything
		 * pinned above the app - the ticker, the dev badge - pushed the bar
		 * down onto a legend that had stayed put.
		 */
		.legend {
			position: absolute;
			top: calc(var(--safe-top) + 74px);
			left: 14px;
			z-index: 19;
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.4rem;
		}
	}
</style>

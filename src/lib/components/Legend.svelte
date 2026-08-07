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
	const provinces = $derived(passport.provincesVisited.size);
</script>

<div class="legend">
	<span class="chip">
		<CupIcon height={14} />
		To go <strong>{remaining.toLocaleString()}</strong>
	</span>
	<!--
		Each chip waits for its first fact: Provinces for a Canadian stamp,
		Countries for any stamp at all. "0 out of 13" reads as a stat before a
		new passport has earned one - the chip appearing is itself the signal
		that the category has started.
	-->
	{#if provinces > 0}
		<span class="chip">
			<CupIcon height={14} collected />
			Provinces <strong>{provinces}</strong>
		</span>
	{/if}
	{#if countries > 0}
		<span class="chip">
			<CupIcon height={14} collected />
			Countries <strong>{countries}</strong>
		</span>
	{/if}
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

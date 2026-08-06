<script lang="ts">
	/**
	 * Desktop-only stats rail.
	 *
	 * It is not rendered on mobile on purpose: the top bar's meter already
	 * shows the collected count and the HUD shows what is left, so these chips
	 * would be a third copy of the same two numbers competing for a 390px row.
	 * The full breakdown lives one tap away on the Passport tab.
	 */
	import { passport } from '$lib/stores/passport.svelte';

	const countries = $derived(passport.countriesVisited.size);
</script>

<div class="legend">
	<span class="chip"><i class="sw mint" aria-hidden="true"></i> Stamped <strong>{passport.count}</strong></span>
	<span class="chip"><i class="sw gold" aria-hidden="true"></i> Countries <strong>{countries}</strong></span>
</div>

<style>
	.legend {
		display: none;
	}
	.sw {
		width: 8px;
		height: 8px;
		flex: none;
	}
	.sw.mint {
		background: var(--mint);
	}
	.sw.gold {
		background: var(--gold);
	}

	@media (min-width: 900px) {
		.legend {
			position: absolute;
			top: 74px;
			left: 14px;
			z-index: 19;
			display: flex;
			flex-direction: column;
			align-items: flex-start;
			gap: 0.4rem;
		}
	}
</style>

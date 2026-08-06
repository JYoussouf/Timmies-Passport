<script lang="ts">
	/**
	 * The hero count: how many Timmies are still out there.
	 *
	 * Positioning is owned by the parent. On mobile it is one item in the HUD
	 * strip; on desktop it pins itself to the top centre of the screen.
	 */
	import { passport } from '$lib/stores/passport.svelte';
	import { locations } from '$lib/stores/locations.svelte';

	const remaining = $derived(Math.max(0, locations.total - passport.count));
</script>

{#if locations.total > 0}
	<div class="hud" role="status">
		<span class="tabs" aria-hidden="true"><i></i><i></i></span>
		<span class="plate">
			<span class="row">
				<span class="donut" aria-hidden="true"></span>
				<span class="num pixel">{remaining.toLocaleString()}</span>
			</span>
			<span class="cap pixel">unstamped</span>
		</span>
		<span class="tabs" aria-hidden="true"><i></i><i></i></span>
	</div>
{/if}

<style>
	.hud {
		flex: none;
		display: flex;
		align-items: center;
		gap: 4px;
		pointer-events: none;
	}
	.tabs {
		display: flex;
		gap: 2px;
	}
	.tabs i {
		width: 4px;
		height: 14px;
		background: var(--cream);
		box-shadow: 2px 2px 0 var(--cabinet-lo);
	}
	.plate {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		padding: 0.45rem 0.7rem;
		background: var(--gold);
		color: var(--cabinet-lo);
		border-top: 2px solid #ffd479;
		border-left: 2px solid #ffd479;
		border-right: 2px solid var(--gold-deep);
		border-bottom: 2px solid var(--gold-deep);
		box-shadow: var(--bevel-md);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	/* The red donut that the number refers to, so the map legend is inline. */
	.donut {
		width: 12px;
		height: 12px;
		flex: none;
		background: transparent;
		box-shadow:
			inset 0 0 0 3px var(--tim-red),
			inset 0 0 0 4px transparent;
	}
	.num {
		font-size: 0.8rem;
		line-height: 1;
	}
	.cap {
		font-size: 0.4rem;
		line-height: 1;
		opacity: 0.75;
	}

	@media (min-width: 900px) {
		.hud {
			position: absolute;
			top: 18px;
			left: 50%;
			transform: translateX(-50%);
			z-index: 20;
			gap: 5px;
		}
		.plate {
			padding: 0.55rem 0.9rem;
		}
		.num {
			font-size: 1.05rem;
		}
		.cap {
			font-size: 0.5rem;
		}
		.donut {
			width: 14px;
			height: 14px;
		}
		.tabs i {
			width: 5px;
			height: 16px;
		}
	}
</style>

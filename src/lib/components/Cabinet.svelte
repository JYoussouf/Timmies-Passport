<script lang="ts">
	/**
	 * The arcade cabinet frame.
	 *
	 * On desktop this is a thick beveled console with a title plate screwed to
	 * the top edge. On mobile the frame does not shrink, it dissolves: the
	 * border collapses to a hairline bevel and the title plate is dropped, so
	 * every pixel of vertical space goes to the map instead of to decoration.
	 */
	import type { Snippet } from 'svelte';
	import CupIcon from './CupIcon.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="cabinet">
	<div class="viewport">
		{@render children()}
	</div>

	<div class="title-plate" aria-hidden="true">
		<CupIcon size={24} outline="var(--tim-red)" fill="var(--cream)" />
		<span class="label pixel">My Timmies Passport</span>
		<CupIcon size={24} outline="var(--tim-red)" fill="var(--cream)" />
	</div>
</div>

<style>
	.cabinet {
		position: fixed;
		inset: 0;
		background: var(--cabinet);
		padding: var(--frame);
		/* Outer bevel, so the cabinet reads as a physical object. */
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.viewport {
		position: absolute;
		inset: var(--frame);
		overflow: hidden;
		background: var(--land);
		/* Inset bevel: the screen sits *inside* the cabinet. */
		border-top: 2px solid var(--cabinet-lo);
		border-left: 2px solid var(--cabinet-lo);
		border-right: 2px solid var(--cabinet-hi);
		border-bottom: 2px solid var(--cabinet-hi);
	}

	.title-plate {
		display: none;
	}

	@media (min-width: 900px) {
		.cabinet {
			/* Room for the title plate to sit on the top rail. */
			padding-top: 46px;
		}
		.viewport {
			top: 46px;
		}
		.title-plate {
			position: absolute;
			top: 4px;
			left: 50%;
			transform: translateX(-50%);
			z-index: 2;
			display: flex;
			align-items: center;
			gap: 0.9rem;
			padding: 0.5rem 0.9rem;
			background: var(--screen-deep);
			border-top: 2px solid var(--cabinet-lo);
			border-left: 2px solid var(--cabinet-lo);
			border-right: 2px solid var(--cabinet-hi);
			border-bottom: 2px solid var(--cabinet-hi);
		}
		.label {
			font-size: 0.75rem;
			color: var(--gold);
			text-shadow: 2px 2px 0 var(--cabinet-lo);
		}
	}
</style>

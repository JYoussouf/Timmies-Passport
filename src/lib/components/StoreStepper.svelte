<script lang="ts">
	/**
	 * Four arrows around the selected cup, for walking the map store to store.
	 *
	 * They sit at the centre of the map because that is where a selected store
	 * always is, so no projection maths is needed to keep them on it. Same round
	 * bevelled buttons as the compass rim, since they do the same kind of job.
	 *
	 * Each one jumps to the closest store in that quadrant - north-east still
	 * answers to up - and is disabled when that quadrant is empty, which is what
	 * happens at a coastline.
	 */
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import type { LocationProps } from '$lib/types';

	let { onstep }: { onstep: (id: string) => void } = $props();

	const DIRECTIONS = [
		{ key: 'up', heading: 0, label: 'Nearest north', path: 'M12 5v14M6 11l6-6 6 6' },
		{ key: 'right', heading: 90, label: 'Nearest east', path: 'M5 12h14M13 6l6 6-6 6' },
		{ key: 'down', heading: 180, label: 'Nearest south', path: 'M12 19V5M6 13l6 6 6-6' },
		{ key: 'left', heading: 270, label: 'Nearest west', path: 'M19 12H5M11 6l-6 6 6 6' }
	] as const;

	const here = $derived(ui.selectedId ? locations.coordsOf(ui.selectedId) : undefined);

	/** Hidden closures are not somewhere the arrows should be able to strand you. */
	const allow = (p: LocationProps) =>
		p.id !== ui.selectedId &&
		(!p.closed || settings.showClosed || passport.isVisited(p.id));

	const targets = $derived.by(() => {
		if (!here) return {} as Record<string, string | undefined>;
		const out: Record<string, string | undefined> = {};
		for (const d of DIRECTIONS) out[d.key] = locations.nearestToward(here, d.heading, allow);
		return out;
	});
</script>

{#if here}
	<div class="stepper" aria-label="Jump to the nearest store in a direction">
		<div class="ring">
			{#each DIRECTIONS as d (d.key)}
				{@const target = targets[d.key]}
				<button
					class="btn {d.key}"
					aria-label={d.label}
					title={d.label}
					disabled={!target}
					onclick={() => target && onstep(target)}
				>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<path
							d={d.path}
							fill="none"
							stroke="currentColor"
							stroke-width="2.6"
							stroke-linecap="square"
							stroke-linejoin="miter"
						/>
					</svg>
				</button>
			{/each}
		</div>
	</div>
{/if}

<style>
	/*
	 * Above the check-in card's backdrop, which covers the whole screen to catch
	 * dismiss taps. Both live inside the cabinet, which is what makes this
	 * comparison meaningful - see the note in +page.svelte.
	 */
	.stepper {
		position: absolute;
		inset: 0;
		z-index: 42;
		pointer-events: none;
	}
	/* A zero-sized anchor at the map's centre; the buttons hang off it. */
	.ring {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 0;
		height: 0;
	}

	.btn {
		--size: 36px;
		--radius: 66px;
		position: absolute;
		display: grid;
		place-items: center;
		width: var(--size);
		height: var(--size);
		margin: calc(var(--size) / -2);
		border-radius: 50%;
		pointer-events: auto;
		color: var(--cream);
		background: var(--cabinet);
		box-shadow:
			inset 0 2px 0 var(--cabinet-hi),
			0 0 0 2px var(--cabinet-lo),
			0 3px 0 var(--cabinet-lo);
		transition: background 0.12s linear;
	}
	.btn svg {
		width: 58%;
		height: 58%;
	}
	.btn:hover:not(:disabled) {
		background: var(--cabinet-hi);
	}
	.btn:active:not(:disabled) {
		transform: translateY(3px);
		box-shadow:
			inset 0 2px 0 var(--cabinet-hi),
			0 0 0 2px var(--cabinet-lo);
	}
	/* A coastline, usually. Dimmed rather than hidden, so the ring keeps its
	   shape and the gap reads as "nothing that way". */
	.btn:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.up {
		top: calc(var(--radius) * -1);
		left: 0;
	}
	.down {
		top: var(--radius);
		left: 0;
	}
	.left {
		left: calc(var(--radius) * -1);
		top: 0;
	}
	.right {
		left: var(--radius);
		top: 0;
	}

	@media (min-width: 900px) {
		.btn {
			--size: 40px;
			--radius: 76px;
		}
	}
</style>

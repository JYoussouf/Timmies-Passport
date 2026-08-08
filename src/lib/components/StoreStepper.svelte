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
	 * happens at a coastline. The arrow keys do the same four moves while a
	 * store is selected; with nothing selected they belong to the map, which
	 * pans with them.
	 */
	import { locations } from '$lib/stores/locations.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { haptic } from '$lib/effects';
	import { isPlainKey, isTyping } from '$lib/keys';
	import type { LocationProps } from '$lib/types';

	let { onstep }: { onstep: (id: string) => void } = $props();

	const DIRECTIONS = [
		{ key: 'up', heading: 0, label: 'Nearest north', path: 'M12 5v14M6 11l6-6 6 6' },
		{ key: 'right', heading: 90, label: 'Nearest east', path: 'M5 12h14M13 6l6 6-6 6' },
		{ key: 'down', heading: 180, label: 'Nearest south', path: 'M12 19V5M6 13l6 6 6-6' },
		{ key: 'left', heading: 270, label: 'Nearest west', path: 'M19 12H5M11 6l-6 6 6 6' }
	] as const;

	type DirKey = (typeof DIRECTIONS)[number]['key'];
	const OPPOSITE: Record<DirKey, DirKey> = {
		up: 'down',
		down: 'up',
		left: 'right',
		right: 'left'
	};
	const ARROW_KEYS: Record<string, DirKey> = {
		ArrowUp: 'up',
		ArrowDown: 'down',
		ArrowLeft: 'left',
		ArrowRight: 'right'
	};

	/**
	 * Where each store was reached from, so going back goes back.
	 *
	 * "Nearest in this direction" is not a symmetric relation: step west from
	 * A to B, and the nearest store east of B can easily be some third one
	 * that happens to sit closer than A does. Correct by the rule, baffling in
	 * the hand - you press left then right and end up somewhere new. Recording
	 * the arrival makes the reverse step retrace it, and everything else falls
	 * through to the ordinary search.
	 */
	const cameFrom = new Map<string, Partial<Record<DirKey, string>>>();

	const here = $derived(ui.selectedId ? locations.coordsOf(ui.selectedId) : undefined);

	/** Hidden closures are not somewhere the arrows should be able to strand you. */
	const allow = (p: LocationProps) =>
		p.id !== ui.selectedId &&
		(!p.closed || settings.showClosed || passport.isVisited(p.id));

	const targets = $derived.by(() => {
		if (!here || !ui.selectedId) return {} as Record<string, string | undefined>;
		const back = cameFrom.get(ui.selectedId) ?? {};
		const out: Record<string, string | undefined> = {};
		for (const d of DIRECTIONS) {
			out[d.key] = back[d.key] ?? locations.nearestToward(here, d.heading, allow);
		}
		return out;
	});

	function step(dir: DirKey) {
		const target = targets[dir];
		if (!target || !ui.selectedId) return;
		const trail = cameFrom.get(target) ?? {};
		trail[OPPOSITE[dir]] = ui.selectedId;
		cameFrom.set(target, trail);
		onstep(target);
	}

	/*
	 * The same four moves from the keyboard. Only while a store is selected -
	 * otherwise the arrows belong to the map, which pans with them.
	 */
	$effect(() => {
		if (!ui.selectedId) return;
		const onKey = (e: KeyboardEvent) => {
			const dir = ARROW_KEYS[e.key];
			if (!dir || !isPlainKey(e) || isTyping(e.target)) return;
			if (!targets[dir]) return;
			e.preventDefault();
			haptic(8);
			step(dir);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	});

	/*
	 * The check-in card and this ring share the space around the cup, and the
	 * ring paints on top. Rather than yielding wholesale (the old behaviour,
	 * which left the arrows permanently hidden once street view started opening
	 * by default), each arrow is measured against the card. The up arrow -
	 * the one the card actually reaches - slides down to sit just beneath it;
	 * the others, and an up arrow with nowhere left to go before the cup,
	 * step aside instead. Keyboard steps keep working for a hidden arrow -
	 * the direction still exists, just not the button.
	 *
	 * Geometry comes from the ring anchor and the CSS vars, never from the
	 * buttons' current rects: a slid arrow no longer collides, and measuring
	 * it where it is would clear the slide and oscillate.
	 */
	let ringEl = $state<HTMLElement>();
	let btnEls: Partial<Record<DirKey, HTMLButtonElement>> = $state({});
	let covered = $state<Record<DirKey, boolean>>({
		up: false,
		down: false,
		left: false,
		right: false
	});
	let upTop = $state<number | null>(null);

	$effect(() => {
		void ui.selectedId;
		if (!here) return;
		const measure = () => {
			const ring = ringEl;
			const sample = btnEls.up ?? btnEls.down;
			if (!ring || !sample) return;
			const card = document.querySelector('[data-checkin-card]');
			const cr = card?.getBoundingClientRect();
			const cs = getComputedStyle(sample);
			const size = parseFloat(cs.getPropertyValue('--size'));
			const radius = parseFloat(cs.getPropertyValue('--radius'));
			const anchor = ring.getBoundingClientRect();
			const cx = anchor.left;
			const cy = anchor.top;
			const centres: Record<DirKey, [number, number]> = {
				up: [cx, cy - radius],
				down: [cx, cy + radius],
				left: [cx - radius, cy],
				right: [cx + radius, cy]
			};
			const collides = ([x, y]: [number, number]) =>
				!!cr &&
				x - size / 2 < cr.right + 4 &&
				x + size / 2 > cr.left - 4 &&
				y - size / 2 < cr.bottom + 4 &&
				y + size / 2 > cr.top - 4;
			const next = {
				up: false,
				down: collides(centres.down),
				left: collides(centres.left),
				right: collides(centres.right)
			};
			let nextUpTop: number | null = null;
			if (collides(centres.up) && cr) {
				/*
				 * Centre the arrow in the band between the card and the cup
				 * (whose selection brackets reach about 26px above centre).
				 * A band tighter than the arrow splits the shortfall between
				 * the card's bottom frame and the cup's lid, which reads far
				 * better than sitting squarely on either; a band with no room
				 * at all means the card is over the cup and the arrow hides.
				 */
				const bandTop = cr.bottom;
				const bandBottom = cy - 26;
				if (bandBottom - bandTop < 12) {
					next.up = true;
				} else {
					nextUpTop = (bandTop + bandBottom) / 2 - cy;
				}
			}
			covered = next;
			upTop = nextUpTop;
		};
		// The card settles over a couple of frames (mount, then measured growth).
		let raf = requestAnimationFrame(() => {
			raf = requestAnimationFrame(measure);
		});
		const card = document.querySelector('[data-checkin-card]');
		const ro = new ResizeObserver(measure);
		if (card) ro.observe(card);
		window.addEventListener('resize', measure);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			window.removeEventListener('resize', measure);
		};
	});
</script>

{#if here && !ui.stamping}
	<div class="stepper" aria-label="Jump to the nearest store in a direction">
		<div class="ring" class:flight={ui.mapMoving} bind:this={ringEl}>
			{#each DIRECTIONS as d (d.key)}
				{@const target = targets[d.key]}
				<button
					bind:this={btnEls[d.key]}
					class="btn {d.key}"
					class:covered={covered[d.key]}
					style={d.key === 'up' && upTop !== null ? `top: ${upTop}px;` : ''}
					aria-label={d.label}
					title={d.label}
					disabled={!target}
					onclick={() => step(d.key)}
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
	 * Above the check-in card, which is docked over the map's centre and would
	 * otherwise cover the arrows nearest it. Both live inside the cabinet,
	 * which is what makes this comparison meaningful - see the note in
	 * +page.svelte.
	 */
	.stepper {
		position: absolute;
		inset: 0;
		z-index: 42;
		pointer-events: none;
	}
	/*
	 * A zero-sized anchor on the cup. The map's centre is not the cabinet's -
	 * the frame and the bottom dock take uneven bites out of it - so this uses
	 * the measured value MapView publishes rather than 50%.
	 *
	 * Fixed, not absolute: those values are viewport coordinates, and an
	 * absolute box inside the cabinet would resolve them against its padding
	 * box instead, landing a frame's width off.
	 */
	.ring {
		position: fixed;
		left: var(--map-cx, 50%);
		top: var(--cup-y, 50%);
		width: 0;
		height: 0;
		/* Dimmed while the camera moves, back the instant it stops - the map's
		   own movestart/moveend are the clock, not a timer's guess. */
		opacity: 1;
		transition: opacity 0.12s ease;
	}
	.ring.flight {
		opacity: 0.35;
	}
	@media (prefers-reduced-motion: reduce) {
		.ring,
		.ring.flight {
			transition: none;
		}
	}

	.btn {
		--size: 30px;
		--radius: 46px;
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

	/* Measured onto the card: the arrow steps aside, the direction remains
	   (keyboard still takes it), and visibility keeps the layout honest so
	   the measurement cannot feed back into itself. */
	.btn.covered {
		visibility: hidden;
		pointer-events: none;
	}

	@media (min-width: 900px) {
		.btn {
			--size: 34px;
			--radius: 52px;
		}
	}
</style>

<script lang="ts">
	/**
	 * Support affordance: a single button that opens a small menu with a bug
	 * report and an about link. Collapsed by default so it costs one control's
	 * worth of screen, which is all a rarely-used utility should take.
	 */
	import { report } from '$lib/stores/report.svelte';

	const ABOUT_URL = 'https://joseppy.ca';

	let open = $state(false);
	let root = $state<HTMLDivElement>();

	function close() {
		open = false;
	}

	/** Close on any outside interaction or on Escape. */
	$effect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) close();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
		};
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="support" bind:this={root}>
	{#if open}
		<div class="menu" role="menu">
			<button
				class="item pixel"
				role="menuitem"
				onclick={() => {
					close();
					report.start({ kind: 'bug' });
				}}
			>
				Report a bug
			</button>
			<a
				class="item pixel"
				role="menuitem"
				href={ABOUT_URL}
				target="_blank"
				rel="noopener noreferrer"
				onclick={close}
			>
				About me
			</a>
			<a class="item pixel" role="menuitem" href="/about" onclick={close}>
				Legal
			</a>
		</div>
	{/if}

	<button
		class="ctl"
		class:on={open}
		aria-expanded={open}
		aria-haspopup="menu"
		aria-label="Support"
		title="Support"
		onclick={() => (open = !open)}
	>
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" />
			<path
				d="M9 9a3 3 0 114 2.8V14"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="square"
			/>
			<rect x="11.4" y="16" width="2.2" height="2.2" fill="currentColor" />
		</svg>
	</button>
</div>

<style>
	.support {
		position: relative;
	}
	.ctl {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		color: var(--cream);
		background: var(--cabinet);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md);
		transition: background 0.12s linear;
	}
	.ctl:hover {
		background: var(--cabinet-hi);
	}
	.ctl:active {
		transform: translate(3px, 3px);
		box-shadow: none;
	}
	.ctl.on {
		background: var(--gold);
		color: var(--cabinet-lo);
		border-top-color: #ffd479;
		border-left-color: #ffd479;
		border-right-color: var(--gold-deep);
		border-bottom-color: var(--gold-deep);
	}

	/*
	 * Opens upward, out of flow. In flow it grew the button's box, and the
	 * gutter that holds it is centred with translateY(-50%) - so every item
	 * added pushed the button half its height further down, off the bottom of
	 * the screen, and clipped the menu's own last row. Anchored, the gutter
	 * only ever centres the 44px button. Mirrors the settings menu opposite.
	 */
	.menu {
		position: absolute;
		bottom: calc(100% + 6px);
		left: 0;
		display: flex;
		flex-direction: column;
		background: var(--cabinet);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md);
		transform-origin: bottom left;
		animation: pop 0.16s steps(3, end);
	}
	@keyframes pop {
		from {
			transform: scale(0.7);
			opacity: 0;
		}
	}
	/* Anchors and the report button, which has to look identical to its neighbours. */
	.item {
		display: flex;
		align-items: center;
		width: 100%;
		min-height: 44px;
		padding: 0 0.9rem;
		text-align: left;
		background: none;
		font-size: 0.45rem;
		color: var(--gold);
		text-decoration: none;
		white-space: nowrap;
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.item:last-child {
		border-bottom: none;
	}
	.item:hover {
		background: var(--cabinet-hi);
		color: var(--cream);
	}
</style>

<script lang="ts">
	/**
	 * Map preferences, in the tab bar's other gutter so it balances support.
	 * A menu rather than a bare toggle, so there is somewhere for the next
	 * preference to go.
	 */
	import { settings } from '$lib/stores/settings.svelte';

	/** Eight teeth, evenly spaced around the rim. */
	const TEETH = [0, 45, 90, 135, 180, 225, 270, 315];

	let open = $state(false);
	let root = $state<HTMLDivElement>();

	$effect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) open = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="settings" bind:this={root}>
	{#if open}
		<div class="menu" role="menu">
			<button
				class="item pixel"
				role="menuitemcheckbox"
				aria-checked={settings.showClosed}
				onclick={() => settings.toggleClosed()}
			>
				<span class="box" class:on={settings.showClosed} aria-hidden="true"></span>
				Show closed locations
			</button>
		</div>
	{/if}

	<button
		class="ctl"
		class:on={open}
		aria-expanded={open}
		aria-haspopup="menu"
		aria-label="Map settings"
		title="Map settings"
		onclick={() => (open = !open)}
	>
		<!--
			A cog, not a sun: the teeth are stubby and sit flush on a thick rim.
			Thin rays radiating from a small circle read as sunshine.
		-->
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<g stroke="currentColor" stroke-width="3.2" fill="none" stroke-linecap="butt">
				<circle cx="12" cy="12" r="6.4" />
				{#each TEETH as a (a)}
					<line
						x1={12 + 8 * Math.cos((a * Math.PI) / 180)}
						y1={12 + 8 * Math.sin((a * Math.PI) / 180)}
						x2={12 + 10.4 * Math.cos((a * Math.PI) / 180)}
						y2={12 + 10.4 * Math.sin((a * Math.PI) / 180)}
					/>
				{/each}
			</g>
		</svg>
	</button>
</div>

<style>
	.settings {
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

	/* Opens upward and to the left; it lives in the bottom-right corner. */
	.menu {
		position: absolute;
		bottom: calc(100% + 6px);
		right: 0;
		width: 230px;
		background: var(--cabinet);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md);
		transform-origin: bottom right;
		animation: pop 0.16s steps(3, end);
	}
	@keyframes pop {
		from {
			transform: scale(0.8);
			opacity: 0;
		}
	}
	.item {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		width: 100%;
		min-height: 44px;
		padding: 0 0.85rem;
		font-size: 0.45rem;
		text-align: left;
		color: var(--gold);
	}
	.item:hover {
		background: var(--cabinet-hi);
		color: var(--cream);
	}
	.box {
		flex: none;
		width: 14px;
		height: 14px;
		background: var(--screen-deep);
		box-shadow: inset 0 0 0 2px var(--cabinet-lo);
	}
	.box.on {
		background: var(--green);
		box-shadow:
			inset 0 0 0 2px var(--green-deep),
			inset 0 0 0 5px var(--green);
	}
</style>

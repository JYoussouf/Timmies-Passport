<script lang="ts">
	/**
	 * Map preferences, in the tab bar's other gutter so it balances support.
	 * A menu rather than a bare toggle, so there is somewhere for the next
	 * preference to go.
	 */
	import { settings } from '$lib/stores/settings.svelte';

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
		<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
			<circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" stroke-width="2" />
			<path
				d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="square"
			/>
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
		background: var(--mint);
		box-shadow:
			inset 0 0 0 2px var(--mint-deep),
			inset 0 0 0 5px var(--mint);
	}
	.hint {
		margin: 0;
		padding: 0 0.85rem 0.7rem;
		font-size: 0.75rem;
		line-height: 1.4;
		color: var(--cream-dim);
	}
</style>

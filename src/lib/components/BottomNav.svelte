<script lang="ts">
	import { page } from '$app/stores';
	import SupportMenu from './SupportMenu.svelte';
	import SettingsMenu from './SettingsMenu.svelte';

	/** `href: null` renders an inert tab: visible, labelled, but not a link. */
	const tabs = [
		{ href: '/', label: 'Map', icon: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zm6-3v15m6-12v15' },
		{
			href: '/passport',
			label: 'Passport',
			icon: 'M5 4h11a3 3 0 013 3v10a3 3 0 01-3 3H5a1 1 0 01-1-1V5a1 1 0 011-1zm3 6h7M8 14h5'
		},
		{
			href: null,
			label: 'Leaderboard',
			note: 'coming soon!',
			icon: 'M8 21h8M12 17v4M5 4h14v4a5 5 0 01-5 5h-4a5 5 0 01-5-5V4zM5 6H3v2a3 3 0 003 3M19 6h2v2a3 3 0 01-3 3'
		}
	];
	const active = $derived($page.url.pathname);
</script>

<nav class="nav" aria-label="Primary">
	<div class="gutter left"><SupportMenu /></div>
	<div class="gutter right"><SettingsMenu /></div>

	{#each tabs as t (t.label)}
		<svelte:element
			this={t.href ? 'a' : 'span'}
			href={t.href}
			class:active={active === t.href}
			class:inert={!t.href}
			aria-disabled={t.href ? undefined : 'true'}
			aria-current={active === t.href ? 'page' : undefined}
		>
			<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
				<path
					d={t.icon}
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="square"
					stroke-linejoin="miter"
				/>
			</svg>
			<span class="label pixel">{t.label}</span>
			{#if t.note}<span class="note pixel">{t.note}</span>{/if}
		</svelte:element>
	{/each}
</nav>

<style>
	/*
	 * The control deck. Placement belongs to the bottom dock that wraps it, so
	 * nothing above has to guess this bar's height.
	 */
	.nav {
		order: 4;
		position: relative;
		/* Above the search dock, so the gutter menus open over it rather than
		   under it - they are anchored here and grow upward. */
		z-index: 26;
		display: flex;
		justify-content: center;
		/* Symmetric gutters: the left one holds support, the right keeps the
		   tabs centred against it. */
		padding: 0 52px;
		background: var(--cabinet);
		border-top: 3px solid var(--cabinet-hi);
		box-shadow: 0 -3px 0 var(--cabinet-lo);
	}
	a,
	span.inert {
		/* Capped so the tabs do not balloon on a wide-but-not-desktop window. */
		flex: 1 1 0;
		max-width: 190px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-height: 54px;
		padding: 0.45rem 0.25rem;
		color: var(--cream-dim);
		text-decoration: none;
		border-right: 2px solid var(--cabinet-lo);
		transition: color 0.12s linear, background 0.12s linear;
	}
	:global(.nav > :last-child) {
		border-right: none;
	}
	span.inert {
		cursor: default;
		color: var(--cream-faint);
	}
	.gutter {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
	}
	.gutter.left {
		left: 5px;
	}
	.gutter.right {
		right: 5px;
	}

	.label {
		font-size: 0.45rem;
		line-height: 1;
		text-align: center;
	}
	.note {
		font-size: 0.34rem;
		color: var(--cream-faint);
	}
	.active .note {
		color: rgba(255, 255, 255, 0.75);
	}
	a:hover {
		color: var(--cream);
		background: var(--cabinet-hi);
	}
	a.active {
		color: #fff;
		background: var(--tim-red);
		box-shadow: inset 0 3px 0 #f0555b, inset 0 -3px 0 #7d1216;
	}


</style>

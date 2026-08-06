<script lang="ts">
	import { page } from '$app/stores';

	const tabs = [
		{ href: '/', label: 'Map', icon: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zm6-3v15m6-12v15' },
		{
			href: '/passport',
			label: 'Passport',
			icon: 'M5 4h11a3 3 0 013 3v10a3 3 0 01-3 3H5a1 1 0 01-1-1V5a1 1 0 011-1zm3 6h7M8 14h5'
		},
		{
			href: '/leaderboard',
			label: 'Leaders',
			icon: 'M8 21h8M12 17v4M5 4h14v4a5 5 0 01-5 5h-4a5 5 0 01-5-5V4zM5 6H3v2a3 3 0 003 3M19 6h2v2a3 3 0 01-3 3'
		}
	];
	const active = $derived($page.url.pathname);
</script>

<nav class="nav" aria-label="Primary">
	{#each tabs as t (t.href)}
		<a href={t.href} class:active={active === t.href} aria-current={active === t.href ? 'page' : undefined}>
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
			<span class="pixel">{t.label}</span>
		</a>
	{/each}
</nav>

<style>
	/*
	 * Full-width control deck. Fixed rather than absolute so it survives the
	 * scrolling pages, and padded by the home-indicator inset so iOS Safari
	 * never overlaps the tabs.
	 */
	.nav {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 35;
		display: flex;
		background: var(--cabinet);
		border-top: 3px solid var(--cabinet-hi);
		box-shadow: 0 -3px 0 var(--cabinet-lo);
		padding-bottom: var(--safe-bottom);
	}
	a {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 5px;
		min-height: 56px;
		padding: 0.5rem 0.25rem;
		color: var(--cream-dim);
		text-decoration: none;
		border-right: 2px solid var(--cabinet-lo);
		transition: color 0.12s linear, background 0.12s linear;
	}
	a:last-child {
		border-right: none;
	}
	a span {
		font-size: 0.45rem;
		line-height: 1;
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

	@media (min-width: 900px) {
		.nav {
			left: 50%;
			right: auto;
			transform: translateX(-50%);
			bottom: calc(var(--frame) + 34px);
			border: 2px solid var(--cabinet-lo);
			border-top-color: var(--cabinet-hi);
			border-left-color: var(--cabinet-hi);
			box-shadow: var(--bevel-md);
			padding-bottom: 0;
		}
		a {
			min-width: 108px;
		}
	}
</style>

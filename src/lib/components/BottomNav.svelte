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

<nav class="nav">
	{#each tabs as t}
		<a href={t.href} class:active={active === t.href} aria-label={t.label}>
			<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
				<path d={t.icon} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
			<span>{t.label}</span>
		</a>
	{/each}
</nav>

<style>
	.nav {
		position: fixed;
		bottom: calc(var(--safe-bottom) + 12px);
		left: 50%;
		transform: translateX(-50%);
		z-index: 35;
		display: flex;
		gap: 0.25rem;
		background: var(--espresso);
		padding: 0.4rem;
		border-radius: 999px;
		box-shadow: var(--shadow-lg);
	}
	a {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
		padding: 0.5rem 1.1rem;
		border-radius: 999px;
		color: rgba(247, 239, 227, 0.6);
		text-decoration: none;
		transition: color 0.2s, background 0.2s;
	}
	a span {
		font-size: 0.68rem;
		font-weight: 600;
	}
	a:hover {
		color: var(--cream);
	}
	a.active {
		color: #fff;
		background: var(--accent);
	}
</style>

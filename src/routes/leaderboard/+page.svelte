<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { fetchLeaderboard, type LeaderboardData } from '$lib/api';
	import { locations } from '$lib/stores/locations.svelte';

	let data = $state<LeaderboardData | null>(null);
	let loaded = $state(false);

	onMount(async () => {
		locations.load();
		data = await fetchLeaderboard();
		loaded = true;
	});

	const hasData = $derived(
		!!data && (data.topLocations.length > 0 || data.totalCheckIns > 0)
	);
	const medals = ['🥇', '🥈', '🥉'];
</script>

<svelte:head><title>Leaderboard — Timmies Passport</title></svelte:head>

<div class="page">
	<PageHeader title="Leaderboard" />

	<div class="body">
		{#if data && hasData}
			<section class="totals">
				<div class="stat card">
					<span class="n">{data.totalCheckIns.toLocaleString()}</span>
					<small>total check-ins</small>
				</div>
				<div class="stat card">
					<span class="n">{data.totalCollectors.toLocaleString()}</span>
					<small>passport holders</small>
				</div>
			</section>

			<h2 class="section-title">🔥 Most-stamped Timmies</h2>
			<ul class="rank card">
				{#each data.topLocations as l, i (l.id)}
					<li>
						<span class="pos">{medals[i] ?? i + 1}</span>
						<div class="info">
							<strong>{l.name}</strong>
							<small>{[l.city, l.region].filter(Boolean).join(', ') || '—'}</small>
						</div>
						<span class="count">{l.count.toLocaleString()}</span>
					</li>
				{/each}
			</ul>

			<h2 class="section-title">🌍 Country completion</h2>
			<ul class="rank card">
				{#each data.topCountries as c (c.country_code)}
					<li class="country">
						<span class="cc">{c.country_code}</span>
						<div class="info">
							<strong>{c.country || c.country_code}</strong>
							<div class="cbar">
								<span style="width: {Math.min(100, (c.visited / Math.max(1, c.total)) * 100)}%"></span>
							</div>
						</div>
						<span class="count">{c.visited}<small>/{c.total}</small></span>
					</li>
				{/each}
			</ul>
		{:else if loaded}
			<div class="empty card">
				<span class="emoji">📊</span>
				<h2>No global stats yet</h2>
				<p>
					Leaderboards light up once the cloud backend is connected and the first passport holders
					start checking in. Your own progress is always safe on this device.
				</p>
				<a class="btn btn-primary" href="/">Explore the map</a>
			</div>
		{:else}
			<div class="loading">Tallying the leaderboard…</div>
		{/if}
	</div>

	<BottomNav />
</div>

<style>
	.page {
		min-height: 100dvh;
		background: var(--bg);
	}
	.body {
		max-width: 620px;
		margin: 0 auto;
		padding: 1rem 1rem calc(var(--safe-bottom) + 90px);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.totals {
		display: flex;
		gap: 0.75rem;
	}
	.stat {
		flex: 1;
		padding: 1.1rem;
		text-align: center;
	}
	.stat .n {
		display: block;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 2rem;
		color: var(--accent);
	}
	.stat small {
		color: var(--ink-soft);
		font-size: 0.8rem;
	}
	.section-title {
		font-size: 1.05rem;
		margin: 0.4rem 0 -0.2rem;
	}
	.rank {
		list-style: none;
		margin: 0;
		padding: 0.4rem 0.9rem;
	}
	.rank li {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.7rem 0;
		border-bottom: 1px solid var(--line);
	}
	.rank li:last-child {
		border-bottom: none;
	}
	.pos {
		flex: none;
		width: 28px;
		text-align: center;
		font-weight: 800;
		color: var(--ink-soft);
	}
	.cc {
		flex: none;
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border-radius: 9px;
		background: var(--surface-2);
		font-size: 0.72rem;
		font-weight: 800;
		color: var(--coffee);
	}
	.info {
		flex: 1;
		min-width: 0;
	}
	.info strong {
		display: block;
		font-size: 0.92rem;
	}
	.info small {
		color: var(--ink-soft);
		font-size: 0.8rem;
	}
	.cbar {
		margin-top: 0.35rem;
		height: 6px;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}
	.cbar span {
		display: block;
		height: 100%;
		background: linear-gradient(90deg, var(--maple), var(--accent));
		border-radius: 999px;
	}
	.count {
		flex: none;
		font-weight: 800;
		color: var(--ink);
	}
	.count small {
		color: var(--ink-faint);
		font-weight: 600;
	}
	.empty {
		padding: 2rem 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.6rem;
	}
	.empty .emoji {
		font-size: 2.4rem;
	}
	.empty p {
		color: var(--ink-soft);
		font-size: 0.92rem;
		margin: 0 0 0.6rem;
	}
	.loading {
		text-align: center;
		color: var(--ink-soft);
		padding: 3rem 1rem;
	}
</style>

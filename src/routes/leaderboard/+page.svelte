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

	const hasData = $derived(!!data && (data.topLocations.length > 0 || data.totalCheckIns > 0));
	/** Plate colour for the top three, arcade high-score style. */
	const place = ['gold', 'silver', 'bronze'];
</script>

<svelte:head><title>Leaderboard — Timmies Passport</title></svelte:head>

<div class="page">
	<PageHeader title="High Scores" />

	<div class="body">
		{#if data && hasData}
			<section class="totals">
				<div class="stat">
					<span class="n pixel">{data.totalCheckIns.toLocaleString()}</span>
					<small>Total check-ins</small>
				</div>
				<div class="stat">
					<span class="n pixel">{data.totalCollectors.toLocaleString()}</span>
					<small>Passport holders</small>
				</div>
			</section>

			<h2 class="section-title">Most-stamped Timmies</h2>
			<ul class="rank">
				{#each data.topLocations as l, i (l.id)}
					<li class={place[i] ?? ''}>
						<span class="pos pixel">{String(i + 1).padStart(2, '0')}</span>
						<div class="info">
							<strong>{l.address || l.name}</strong>
							<small>{[l.city, l.region].filter(Boolean).join(', ') || '—'}</small>
						</div>
						<span class="count pixel">{l.count.toLocaleString()}</span>
					</li>
				{/each}
			</ul>

			<h2 class="section-title">Country completion</h2>
			<ul class="rank">
				{#each data.topCountries as c (c.country_code)}
					<li class="country">
						<span class="cc pixel">{c.country_code}</span>
						<div class="info">
							<strong>{c.country || c.country_code}</strong>
							<div class="cbar" aria-hidden="true">
								<span
									style="width: {Math.min(100, (c.visited / Math.max(1, c.total)) * 100)}%"
								></span>
							</div>
						</div>
						<span class="count pixel">{c.visited}<small>/{c.total}</small></span>
					</li>
				{/each}
			</ul>
		{:else if loaded}
			<div class="empty">
				<span class="emoji" aria-hidden="true">📊</span>
				<h2 class="pixel">No global stats yet</h2>
				<p>
					High scores light up once the cloud backend is connected and the first passport holders
					start checking in. Your own progress is always safe on this device.
				</p>
				<a class="pbtn pbtn-primary" href="/">Explore the map</a>
			</div>
		{:else}
			<div class="loading pixel">Tallying scores…</div>
		{/if}
	</div>

	<BottomNav />
</div>

<style>
	.page {
		min-height: 100dvh;
		background: var(--void);
	}
	.body {
		max-width: 620px;
		margin: 0 auto;
		padding: 1rem 0.85rem calc(var(--safe-bottom) + 90px);
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.totals {
		display: flex;
		gap: 0.6rem;
	}
	.stat {
		flex: 1;
		padding: 1rem 0.6rem;
		text-align: center;
		background: var(--screen-deep);
		border-top: 2px solid var(--cabinet-lo);
		border-left: 2px solid var(--cabinet-lo);
		border-right: 2px solid var(--cabinet-hi);
		border-bottom: 2px solid var(--cabinet-hi);
	}
	.stat .n {
		display: block;
		font-size: 0.95rem;
		color: var(--gold);
		margin-bottom: 0.6rem;
		text-shadow: 2px 2px 0 var(--cabinet-lo);
	}
	.stat small {
		color: var(--cream-dim);
		font-size: 0.72rem;
	}

	.section-title {
		font-size: 0.58rem;
		color: var(--gold);
		margin: 0.4rem 0 -0.2rem;
	}

	.rank {
		list-style: none;
		margin: 0;
		padding: 0;
		background: var(--cabinet);
		border: 2px solid var(--cabinet-lo);
	}
	.rank li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 0.75rem;
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.rank li:last-child {
		border-bottom: none;
	}
	.pos {
		flex: none;
		width: 34px;
		text-align: center;
		font-size: 0.55rem;
		color: var(--cream-dim);
	}
	/* Podium plates. */
	.rank li.gold,
	.rank li.silver,
	.rank li.bronze {
		box-shadow: inset 4px 0 0 var(--plate);
	}
	.rank li.gold {
		--plate: #f2b134;
	}
	.rank li.silver {
		--plate: #c8cdd4;
	}
	.rank li.bronze {
		--plate: #c98b52;
	}
	.rank li.gold .pos,
	.rank li.silver .pos,
	.rank li.bronze .pos {
		color: var(--plate);
	}

	.cc {
		flex: none;
		width: 38px;
		height: 34px;
		display: grid;
		place-items: center;
		background: var(--screen-deep);
		border: 2px solid var(--cabinet-lo);
		font-size: 0.45rem;
		color: var(--cream);
	}
	.info {
		flex: 1;
		min-width: 0;
	}
	.info strong {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--cream);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.info small {
		color: var(--cream-dim);
		font-size: 0.78rem;
	}
	/*
	 * An empty track has to read as empty. A pale full-width bar looks like a
	 * completed one, so the track is a dark well and the fill is the only
	 * bright thing in it — with a floor so a nonzero count is never invisible.
	 */
	.cbar {
		margin-top: 0.4rem;
		height: 8px;
		background: var(--screen-deep);
		border: 2px solid var(--cabinet-lo);
	}
	.cbar span {
		display: block;
		height: 100%;
		min-width: 3px;
		background: var(--tim-red);
		box-shadow: inset 0 2px 0 #f0555b;
	}
	.count {
		flex: none;
		font-size: 0.55rem;
		color: var(--cream);
	}
	.count small {
		font-size: 0.75em;
		color: var(--cream-dim);
	}

	.empty {
		padding: 2rem 1.4rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.9rem;
		background: var(--cabinet);
		border: 2px solid var(--cabinet-lo);
	}
	.empty .emoji {
		font-size: 2.2rem;
	}
	.empty h2 {
		font-size: 0.62rem;
		color: var(--gold);
	}
	.empty p {
		color: var(--cream-dim);
		font-size: 0.9rem;
		line-height: 1.5;
		margin: 0 0 0.4rem;
	}
	.loading {
		text-align: center;
		color: var(--cream-dim);
		font-size: 0.55rem;
		padding: 3rem 1rem;
	}
</style>

<script lang="ts">
	import { onMount } from 'svelte';
	import { APP_NAME } from '$lib/brand';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import { fetchLeaderboard, type LeaderboardData } from '$lib/api';
	import { locations } from '$lib/stores/locations.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { locationLabel, locationPlace } from '$lib/location';
	import type { LocationProps } from '$lib/types';

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

	/*
	 * Five shown, plus - if the visitor is signed in and ranked lower than
	 * that - one more row pinned after a break, so "where do I stand" never
	 * means scrolling a list that stops at the top five. Someone already
	 * inside the top five is highlighted in place instead of getting a second,
	 * redundant row.
	 */
	const PLAYER_TOP = 5;
	const shownPlayers = $derived(data?.topPlayers.slice(0, PLAYER_TOP) ?? []);
	/*
	 * Whether the visitor's own row already appears above, checked by id
	 * rather than by comparing rank to PLAYER_TOP - a tie can put someone's
	 * numeric rank at exactly 5 while the five-item slice, which only has
	 * room for one of the tied names, does not happen to include them.
	 */
	const meShown = $derived(!!auth.user && shownPlayers.some((p) => p.id === auth.user!.id));
	const meRankedLower = $derived(!!data?.me && !meShown);

	/**
	 * Standard postal abbreviations, for the same little plate the country
	 * rows put their ISO code on. The fallback trims to two letters so an
	 * unexpected region name degrades to something plausible rather than
	 * overflowing the plate.
	 */
	const PROVINCE_CODES: Record<string, string> = {
		Alberta: 'AB',
		'British Columbia': 'BC',
		Manitoba: 'MB',
		'New Brunswick': 'NB',
		'Newfoundland and Labrador': 'NL',
		'Northwest Territories': 'NT',
		'Nova Scotia': 'NS',
		Nunavut: 'NU',
		Ontario: 'ON',
		'Prince Edward Island': 'PE',
		'Québec': 'QC',
		Saskatchewan: 'SK',
		Yukon: 'YT'
	};
	const provinceCode = (region: string) =>
		PROVINCE_CODES[region] ?? region.slice(0, 2).toUpperCase();

	/**
	 * What tells two stores on the same road apart: a venue when the store
	 * has one (an airport terminal beats any coordinate), and always a maps
	 * link as the ground truth. The locations index is already loaded for
	 * the map, so each row joins back to its record by id.
	 */
	function whereExactly(id: string): { venue: string | null; mapsUrl: string } | null {
		const c = locations.coordsOf(id);
		if (!c) return null;
		return {
			venue: locations.get(id)?.venue ?? null,
			mapsUrl: `https://www.google.com/maps/search/?api=1&query=${c[1]},${c[0]}`
		};
	}
</script>

<svelte:head><title>Leaderboard - {APP_NAME}</title></svelte:head>

<div class="page">
	<PageHeader title="High Scores" />

	<div class="body">
		{#if data && hasData}
			<section class="totals">
				<div class="stat">
					<span class="n pixel">{data.totalCheckIns.toLocaleString()}</span>
					<small>Total stamps</small>
				</div>
				<div class="stat">
					<span class="n pixel">{data.totalCollectors.toLocaleString()}</span>
					<small>Passport holders</small>
				</div>
			</section>

			<h2 class="section-title">Top players</h2>
			{#if shownPlayers.length}
				<ul class="rank">
					{#each shownPlayers as p, i (p.id)}
						<li class="{place[i] ?? ''}" class:me={auth.user?.id === p.id}>
							<span class="pos pixel">
								{#if i < 3}
									<!-- A medal, not a number, for the three that get one -->
									<svg class="medal" viewBox="0 0 24 24" aria-hidden="true">
										<circle cx="12" cy="14" r="7" fill="currentColor" />
										<path
											d="M9 3l3 5 3-5"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="square"
											stroke-linejoin="round"
										/>
									</svg>
								{:else}
									{String(i + 1).padStart(2, '0')}
								{/if}
							</span>
							<div class="info">
								<strong>{p.display_name}</strong>
							</div>
							<span class="count pixel">{p.count.toLocaleString()}</span>
						</li>
					{/each}

					{#if meRankedLower && data?.me}
						<li class="me gap">
							<span class="pos pixel">{String(data.me.rank).padStart(2, '0')}</span>
							<div class="info">
								<strong>{data.me.displayName}</strong>
							</div>
							<span class="count pixel">{data.me.count.toLocaleString()}</span>
						</li>
					{/if}
				</ul>
			{:else}
				<p class="empty-inline">
					No passport holders have checked in yet - be the first name on the board.
				</p>
			{/if}
			{#if !auth.signedIn}
				<button class="signin-hint" onclick={() => ui.openAuth('signup')}>
					Sign in to put your own name on this board &rsaquo;
				</button>
			{/if}

			<h2 class="section-title">Most-stamped Timmies</h2>
			<ul class="rank">
				{#each data.topLocations as l, i (l.id)}
					{@const where = whereExactly(l.id)}
					{@const loc = locations.get(l.id) ?? (l as unknown as LocationProps)}
					<li class={place[i] ?? ''}>
						<span class="pos pixel">{String(i + 1).padStart(2, '0')}</span>
						<div class="info">
							<!-- The same naming the map card and passport list use: a civic
							     address when there is one, "Tim Hortons on X Road" when only
							     the road is known - never a bare city posing as an address. -->
							<strong>{locationLabel(loc)}</strong>
							<small>
								{locationPlace(loc) || [l.city, l.region].filter(Boolean).join(', ') || ' - '}
								{#if where?.venue}
									<span class="dot" aria-hidden="true">·</span>
									{where.venue}
								{/if}
								{#if where}
									<span class="dot" aria-hidden="true">·</span>
									<a
										class="maplink"
										href={where.mapsUrl}
										target="_blank"
										rel="noopener noreferrer">Map &#8599;</a
									>
								{/if}
							</small>
						</div>
						<span class="count pixel">{l.count.toLocaleString()}</span>
					</li>
				{/each}
			</ul>

			<h2 class="section-title">Community progress</h2>
			<ul class="rank">
				{#each data.topCountries as c (c.country_code)}
					<li class="country">
						<span class="cc pixel">{c.country_code}</span>
						<div class="info">
							<strong>{c.country || c.country_code}</strong>
							<div class="cbar" aria-hidden="true">
								<span
									class:zero={c.visited === 0}
									style="width: {Math.min(100, (c.visited / Math.max(1, c.total)) * 100)}%"
								></span>
							</div>
						</div>
						<span class="count pixel">{c.visited}<small>/{c.total}</small></span>
					</li>
				{/each}
			</ul>

			<h3 class="section-sub">Canadian provinces</h3>
			<ul class="rank">
				{#each data.topProvinces as pr (pr.region)}
					<li class="country">
						<span class="cc pixel">{provinceCode(pr.region)}</span>
						<div class="info">
							<strong>{pr.region}</strong>
							<div class="cbar" aria-hidden="true">
								<span
									class:zero={pr.visited === 0}
									style="width: {Math.min(100, (pr.visited / Math.max(1, pr.total)) * 100)}%"
								></span>
							</div>
						</div>
						<span class="count pixel">{pr.visited}<small>/{pr.total}</small></span>
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

	<div class="bottom-dock"><BottomNav /></div>
</div>

<style>
	.page {
		min-height: 100dvh;
		background: var(--void);
	}
	.bottom-dock {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		z-index: 35;
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
	/*
	 * Raised cabinet plates, not screen wells: the dark navy inset read as a
	 * different machine from the warm wood everything else on this page is
	 * made of. Same bevel grammar as the arcade buttons - light catches the
	 * top edge, shadow pools under the bottom.
	 */
	.stat {
		flex: 1;
		padding: 1rem 0.6rem 0.85rem;
		text-align: center;
		background: var(--cabinet);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: 0 3px 0 var(--cabinet-lo);
	}
	.stat .n {
		display: block;
		font-size: 1.15rem;
		color: var(--gold);
		margin-bottom: 0.55rem;
		text-shadow: 2px 2px 0 var(--cabinet-lo);
	}
	.stat small {
		font-family: var(--font-pixel);
		font-size: 0.4rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--cream-dim);
	}

	.section-title {
		font-size: 0.58rem;
		color: var(--gold);
		margin: 0.4rem 0 -0.2rem;
	}
	/* A sub-heading inside Community progress, quieter than a section. */
	.section-sub {
		font-size: 0.45rem;
		font-family: var(--font-pixel);
		text-transform: uppercase;
		letter-spacing: 0.02em;
		color: var(--cream-dim);
		margin: 0 0 -0.2rem;
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
	/* Podium colours live on the rank number alone - no side bar. */
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
	.medal {
		width: 20px;
		height: 20px;
	}

	/*
	 * The signed-in visitor's own row, wherever it lands - inside the top
	 * five, highlighted in place, or pinned after a gap when it does not
	 * reach that far. Same green the rest of the app already uses for "this
	 * one is yours": a collected cup, a completed cluster.
	 */
	.rank li.me {
		background: rgba(62, 217, 87, 0.1);
	}
	/* A visible break, not just a border, so "pinned after a gap" reads as
	   intentional rather than as a row that scrolled loose from the list. */
	.rank li.gap {
		margin-top: 0.6rem;
		border-top: 2px dashed rgba(247, 239, 227, 0.2);
	}

	.empty-inline {
		padding: 1.2rem 0.9rem;
		text-align: center;
		font-size: 0.88rem;
		color: var(--cream-dim);
		background: var(--cabinet);
		border: 2px solid var(--cabinet-lo);
	}

	.signin-hint {
		display: block;
		width: 100%;
		margin-top: 0.6rem;
		padding: 0.6rem 0;
		text-align: center;
		font-size: 0.8rem;
		color: var(--gold);
	}
	.signin-hint:hover {
		color: #ffc450;
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
	.dot {
		color: var(--cream-faint);
	}
	.maplink {
		color: var(--gold);
		text-decoration: underline;
		text-underline-offset: 2px;
		white-space: nowrap;
	}
	.maplink:hover {
		color: #ffc450;
	}
	/*
	 * An empty track has to read as empty. A pale full-width bar looks like a
	 * completed one, so the track is a dark well and the fill is the only
	 * bright thing in it - with a floor so a nonzero count is never invisible.
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
	/* The floor exists so a nonzero count is never invisible; zero must stay
	   actually invisible, or every untouched country reads as started. */
	.cbar span.zero {
		min-width: 0;
		box-shadow: none;
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

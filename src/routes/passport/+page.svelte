<script lang="ts">
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import BadgeGrid from '$lib/components/BadgeGrid.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { ui } from '$lib/stores/ui.svelte';

	onMount(() => {
		passport.hydrate();
		locations.load();
	});

	const earned = $derived(passport.badges.filter((b) => b.earned).length);
	const pct = $derived(
		locations.total ? ((passport.count / locations.total) * 100).toFixed(2) : '0'
	);
	/** 20-segment pixel meter across the top of the inventory. */
	const SEGMENTS = 20;
	const segs = Array.from({ length: SEGMENTS }, (_, i) => i);
	const lit = $derived(Math.ceil((Number(pct) / 100) * SEGMENTS));

	/** The inventory grid: collected stores first, then empty slots. */
	const SLOTS = 24;
	const slots = $derived.by(() => {
		const filled = passport.timeline.slice(0, SLOTS).map((t) => t.id);
		return [
			...filled,
			...Array.from({ length: Math.max(0, SLOTS - filled.length) }, () => null)
		];
	});

	function share() {
		const c = passport.countriesVisited.size;
		const text = `I've collected ${passport.count} Tim Hortons across ${c} ${
			c === 1 ? 'country' : 'countries'
		} on Timmies Passport! ☕🇨🇦`;
		if (navigator.share) navigator.share({ title: 'Timmies Passport', text }).catch(() => {});
		else {
			navigator.clipboard?.writeText(text);
			ui.toast({ emoji: '📋', title: 'Copied!', body: 'Share text is on your clipboard.' });
		}
	}

	/**
	 * Every store is literally called "Tim Hortons", so a list keyed on the
	 * name is a wall of identical rows. Lead with the street address.
	 */
	function nameFor(id: string) {
		const p = locations.get(id);
		return p?.address || p?.name || 'Tim Hortons';
	}
	function placeFor(id: string) {
		const p = locations.get(id);
		return p ? [p.city, p.region, p.country].filter(Boolean).join(', ') : '';
	}
	function fmt(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head><title>Your Passport — Timmies Passport</title></svelte:head>

<div class="page">
	<PageHeader title="Your Passport" />

	<div class="body">
		<section class="hero">
			<div class="readout">
				<span class="num pixel">{passport.count}</span>
				<span class="of pixel">of {locations.total.toLocaleString()}</span>
			</div>
			<div class="meter" aria-hidden="true">
				{#each segs as i (i)}
					<i class:on={i < lit}></i>
				{/each}
			</div>
			<p class="worldwide">You have stamped <strong>{pct}%</strong> of the world's Timmies.</p>

			<div class="metrics">
				<div>
					<span class="m pixel">{passport.countriesVisited.size}</span><small>Countries</small>
				</div>
				<div><span class="m pixel">{passport.regionsVisited.size}</span><small>Regions</small></div>
				<div><span class="m pixel">{earned}</span><small>Badges</small></div>
			</div>

			<button class="pbtn pbtn-gold share" onclick={share}>Share my passport</button>
		</section>

		{#if !auth.signedIn && passport.count > 0}
			<button class="save-cta" onclick={() => ui.openAuth('signup')}>
				<span class="ico" aria-hidden="true">📖</span>
				<div>
					<strong class="pixel">Save your passport</strong>
					<small>Sign up to keep these {passport.count} stamps across devices.</small>
				</div>
				<span class="arrow pixel" aria-hidden="true">&gt;</span>
			</button>
		{/if}

		<h2 class="section-title">Inventory</h2>
		<div class="inventory">
			{#each slots as id, i (id ?? `empty-${i}`)}
				<div class="slot" class:filled={id !== null} title={id ? nameFor(id) : 'Empty slot'}>
					<span class="donut" aria-hidden="true"></span>
					<span class="slot-name">{id ? nameFor(id) : '—'}</span>
				</div>
			{/each}
		</div>

		<h2 class="section-title">Badges</h2>
		<BadgeGrid />

		<h2 class="section-title">Recent stamps</h2>
		{#if passport.count === 0}
			<div class="empty">
				<p>No stamps yet. Open the map and check in to your first Timmies.</p>
				<a class="pbtn pbtn-primary" href="/">Go to map</a>
			</div>
		{:else}
			<ul class="timeline">
				{#each passport.timeline.slice(0, 30) as item (item.id)}
					<li>
						<span class="dot" aria-hidden="true"></span>
						<div class="info">
							<strong>{nameFor(item.id)}</strong>
							<small>{placeFor(item.id)}</small>
						</div>
						<time>{fmt(item.visit.visitedAt)}</time>
					</li>
				{/each}
			</ul>
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

	.hero {
		padding: 1.2rem 1.1rem 1.3rem;
		background: var(--screen-deep);
		border-top: 3px solid var(--cabinet-hi);
		border-left: 3px solid var(--cabinet-hi);
		border-right: 3px solid var(--cabinet-lo);
		border-bottom: 3px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md);
	}
	.readout {
		display: flex;
		align-items: baseline;
		gap: 0.6rem;
		flex-wrap: wrap;
	}
	.num {
		font-size: 2rem;
		line-height: 1;
		color: var(--gold);
		text-shadow: 3px 3px 0 var(--cabinet-lo);
	}
	.of {
		font-size: 0.5rem;
		color: var(--cream-dim);
	}
	.meter {
		display: flex;
		gap: 2px;
		margin: 1.1rem 0 0.8rem;
	}
	.meter i {
		flex: 1;
		height: 12px;
		background: rgba(247, 239, 227, 0.12);
	}
	.meter i.on {
		background: var(--tim-red);
		box-shadow: inset 0 2px 0 #f0555b;
	}
	.worldwide {
		margin: 0;
		font-size: 0.85rem;
		color: var(--cream-dim);
	}
	.worldwide strong {
		color: var(--cream);
	}
	.metrics {
		display: flex;
		gap: 0.5rem;
		margin: 1.2rem 0;
	}
	.metrics div {
		flex: 1;
		text-align: center;
		background: var(--cabinet);
		border: 2px solid var(--cabinet-lo);
		padding: 0.7rem 0.3rem;
	}
	.metrics .m {
		display: block;
		font-size: 0.85rem;
		color: var(--cream);
		margin-bottom: 0.45rem;
	}
	.metrics small {
		font-size: 0.68rem;
		color: var(--cream-dim);
	}
	.share {
		width: 100%;
	}

	.save-cta {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		text-align: left;
		padding: 0.85rem 0.9rem;
		min-height: 56px;
		background: var(--cabinet);
		border-top: 2px solid var(--gold);
		border-left: 2px solid var(--gold);
		border-right: 2px solid var(--gold-deep);
		border-bottom: 2px solid var(--gold-deep);
		box-shadow: var(--bevel-sm);
	}
	.save-cta:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.save-cta .ico {
		font-size: 1.5rem;
	}
	.save-cta div {
		flex: 1;
		min-width: 0;
	}
	.save-cta strong {
		display: block;
		font-size: 0.5rem;
		color: var(--gold);
		margin-bottom: 0.4rem;
	}
	.save-cta small {
		color: var(--cream-dim);
		font-size: 0.8rem;
		line-height: 1.35;
	}
	.save-cta .arrow {
		color: var(--gold);
		font-size: 0.7rem;
	}

	.section-title {
		font-size: 0.58rem;
		color: var(--gold);
		margin: 0.4rem 0 -0.2rem;
	}

	/* Inventory ------------------------------------------------------- */
	.inventory {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(78px, 1fr));
		gap: 0.5rem;
	}
	.slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 0.3rem;
		background: var(--screen-deep);
		border-top: 2px solid var(--cabinet-lo);
		border-left: 2px solid var(--cabinet-lo);
		border-right: 2px solid var(--cabinet-hi);
		border-bottom: 2px solid var(--cabinet-hi);
	}
	/* A donut drawn with hard rings, matching the map sprites. */
	.donut {
		width: 26px;
		height: 26px;
		background: transparent;
		box-shadow:
			inset 0 0 0 4px rgba(247, 239, 227, 0.1),
			inset 0 0 0 9px transparent;
	}
	.slot.filled {
		background: var(--cabinet);
	}
	.slot.filled .donut {
		box-shadow:
			inset 0 0 0 3px var(--mint-deep),
			inset 0 0 0 4px var(--mint),
			inset 0 0 0 9px var(--mint),
			inset 0 0 0 10px var(--mint-deep);
	}
	.slot-name {
		font-size: 0.6rem;
		line-height: 1.2;
		text-align: center;
		color: var(--cream-faint);
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.slot.filled .slot-name {
		color: var(--cream-dim);
	}

	.empty {
		padding: 1.6rem 1.2rem;
		text-align: center;
		color: var(--cream-dim);
		background: var(--cabinet);
		border: 2px solid var(--cabinet-lo);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: center;
	}
	.empty p {
		margin: 0;
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.timeline {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		background: var(--cabinet);
		border: 2px solid var(--cabinet-lo);
	}
	.timeline li {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.7rem 0.75rem;
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.timeline li:last-child {
		border-bottom: none;
	}
	.timeline .dot {
		flex: none;
		width: 12px;
		height: 12px;
		background: transparent;
		box-shadow:
			inset 0 0 0 4px var(--mint),
			inset 0 0 0 5px transparent;
	}
	.timeline .info {
		flex: 1;
		min-width: 0;
	}
	.timeline strong {
		display: block;
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--cream);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.timeline small {
		color: var(--cream-dim);
		font-size: 0.78rem;
	}
	.timeline time {
		flex: none;
		font-size: 0.72rem;
		color: var(--cream-dim);
	}
</style>

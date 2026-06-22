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

	function nameFor(id: string) {
		return locations.get(id)?.name ?? 'Tim Hortons';
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
		<section class="hero card">
			<div class="big">
				<span class="num">{passport.count}</span>
				<span class="of">/ {locations.total.toLocaleString()} collected</span>
			</div>
			<div class="bar"><span style="width: {pct}%"></span></div>
			<p class="worldwide">You've stamped <strong>{pct}%</strong> of the world's Timmies.</p>

			<div class="metrics">
				<div><span class="m">{passport.countriesVisited.size}</span><small>countries</small></div>
				<div><span class="m">{passport.regionsVisited.size}</span><small>regions</small></div>
				<div><span class="m">{earned}</span><small>badges</small></div>
			</div>

			<button class="btn btn-primary share" onclick={share}>Share my passport</button>
		</section>

		{#if !auth.signedIn && passport.count > 0}
			<button class="save-cta" onclick={() => ui.openAuth('signup')}>
				<span>📖</span>
				<div>
					<strong>Save your passport</strong>
					<small>Sign up to keep these {passport.count} stamps across devices.</small>
				</div>
				<span class="arrow">→</span>
			</button>
		{/if}

		<h2 class="section-title">Badges</h2>
		<BadgeGrid />

		<h2 class="section-title">Recent stamps</h2>
		{#if passport.count === 0}
			<div class="empty card">
				<p>No stamps yet. Open the map and check in to your first Timmies! ☕</p>
				<a class="btn btn-ghost" href="/">Go to map</a>
			</div>
		{:else}
			<ul class="timeline">
				{#each passport.timeline.slice(0, 30) as item (item.id)}
					<li>
						<span class="dot"></span>
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
	.hero {
		padding: 1.4rem;
		background: linear-gradient(165deg, var(--espresso), var(--coffee));
		color: var(--cream);
		border: none;
	}
	.big {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.num {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 3.2rem;
		line-height: 1;
	}
	.of {
		opacity: 0.7;
		font-weight: 600;
	}
	.bar {
		margin: 1rem 0 0.5rem;
		height: 8px;
		border-radius: 999px;
		background: rgba(247, 239, 227, 0.18);
		overflow: hidden;
	}
	.bar span {
		display: block;
		height: 100%;
		background: var(--accent);
		border-radius: 999px;
		transition: width 0.6s var(--ease-out);
	}
	.worldwide {
		margin: 0.3rem 0 0;
		font-size: 0.88rem;
		opacity: 0.85;
	}
	.worldwide strong {
		color: #fff;
	}
	.metrics {
		display: flex;
		gap: 0.5rem;
		margin: 1.2rem 0;
	}
	.metrics div {
		flex: 1;
		text-align: center;
		background: rgba(247, 239, 227, 0.1);
		border-radius: var(--r-md);
		padding: 0.7rem 0.4rem;
	}
	.metrics .m {
		display: block;
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.5rem;
	}
	.metrics small {
		font-size: 0.72rem;
		opacity: 0.8;
	}
	.share {
		width: 100%;
	}
	.save-cta {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		text-align: left;
		padding: 0.9rem 1rem;
		border-radius: var(--r-md);
		background: #fff6e9;
		border: 1px solid rgba(176, 122, 79, 0.4);
	}
	.save-cta > span:first-child {
		font-size: 1.6rem;
	}
	.save-cta div {
		flex: 1;
	}
	.save-cta strong {
		display: block;
		font-size: 0.95rem;
	}
	.save-cta small {
		color: var(--ink-soft);
		font-size: 0.82rem;
	}
	.save-cta .arrow {
		color: var(--accent);
		font-weight: 800;
		font-size: 1.2rem;
	}
	.section-title {
		font-size: 1.05rem;
		margin: 0.5rem 0 -0.2rem;
		color: var(--ink);
	}
	.empty {
		padding: 1.4rem;
		text-align: center;
		color: var(--ink-soft);
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
		align-items: center;
	}
	.empty p {
		margin: 0;
	}
	.timeline {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}
	.timeline li {
		display: flex;
		align-items: center;
		gap: 0.8rem;
		padding: 0.7rem 0.2rem;
		border-bottom: 1px solid var(--line);
	}
	.timeline .dot {
		flex: none;
		width: 11px;
		height: 11px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 0 4px rgba(216, 35, 42, 0.14);
	}
	.timeline .info {
		flex: 1;
		min-width: 0;
	}
	.timeline strong {
		display: block;
		font-size: 0.92rem;
	}
	.timeline small {
		color: var(--ink-soft);
		font-size: 0.8rem;
	}
	.timeline time {
		flex: none;
		font-size: 0.78rem;
		color: var(--ink-faint);
		font-weight: 600;
	}
</style>

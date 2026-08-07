<script lang="ts">
	import { onMount } from 'svelte';
	import { APP_NAME, APP_NAME_OWNED } from '$lib/brand';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import CupIcon from '$lib/components/CupIcon.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { locationLabel, locationPlace } from '$lib/location';

	onMount(() => {
		passport.hydrate();
		locations.load();
	});

	const pct = $derived(
		locations.total ? ((passport.count / locations.total) * 100).toFixed(2) : '0'
	);

	/** A segmented meter reads as a score bar; a smooth one reads as a loader. */
	const SEGMENTS = 20;
	const segs = Array.from({ length: SEGMENTS }, (_, i) => i);
	const lit = $derived(Math.ceil((Number(pct) / 100) * SEGMENTS));

	/** Recent stamps show a short preview until the user asks for the rest. */
	const PREVIEW = 5;
	let showAll = $state(false);
	const shown = $derived(showAll ? passport.timeline : passport.timeline.slice(0, PREVIEW));
	const hidden = $derived(Math.max(0, passport.timeline.length - PREVIEW));

	/** Notes live here rather than on the map, where they interrupted a check-in. */
	let editing = $state<string | null>(null);
	function toggleNote(id: string) {
		editing = editing === id ? null : id;
	}

	const countries = $derived(passport.countriesVisited.size);
	const countryTotal = $derived(locations.countryTotal);
	const provinces = $derived(passport.provincesVisited.size);
	const provinceTotal = $derived(locations.provinceTotal);
	const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

	function share() {
		const text = `I've collected ${passport.count} Tim Hortons across ${plural(
			countries,
			'country',
			'countries'
		)} on ${APP_NAME}! ☕🇨🇦`;
		if (navigator.share) navigator.share({ title: APP_NAME, text }).catch(() => {});
		else {
			navigator.clipboard?.writeText(text);
			ui.toast({ emoji: '📋', title: 'Copied!', body: 'Share text is on your clipboard.' });
		}
	}

	function fmt(iso: string) {
		return new Date(iso).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head><title>{APP_NAME_OWNED}</title></svelte:head>

<div class="page">
	<PageHeader title={APP_NAME_OWNED} />

	<div class="body">
		<section class="score">
			<p class="count">
				<span class="num pixel">{passport.count.toLocaleString()}</span>
				<span class="of pixel">of {locations.total.toLocaleString()}</span>
			</p>

			<div class="meter" aria-hidden="true">
				{#each segs as i (i)}
					<i class:on={i < lit}></i>
				{/each}
			</div>

			<!--
				Each line waits for its first fact, the same as the desktop
				legend's chips: a brand new passport has 0% of nothing, and
				"0 out of 13 provinces" reads as a stat rather than an invitation.
			-->
			{#if countries > 0}
				<p class="line">
					<strong>{pct}%</strong> of the world's Timmies, across
					<strong>{countries}</strong> out of {countryTotal} countries.
				</p>
			{/if}
			{#if provinces > 0}
				<p class="line">
					<strong>{provinces}</strong> out of {provinceTotal} provinces in Canada.
				</p>
			{/if}

			<button class="pbtn pbtn-gold share" onclick={share}>Share my passport</button>
		</section>

		<section>
			<h2 class="section-title">Recent stamps</h2>

			{#if passport.count === 0}
				<p class="empty">No stamps yet. Open the map and check in to your first Timmies.</p>
				<a class="pbtn pbtn-primary" href="/">Go to map</a>
			{:else}
				<ul class="stamps">
					{#each shown as item (item.id)}
						<li>
							<div class="row">
								<CupIcon height={20} collected />
								<div class="info">
									<strong>{locationLabel(locations.get(item.id))}</strong>
									<small>{locationPlace(locations.get(item.id))}</small>
								</div>
								<time>{fmt(item.visit.visitedAt)}</time>
							</div>

							{#if editing === item.id}
								<textarea
									rows="2"
									placeholder="Apple fritter and a double-double!"
									value={passport.getNote(item.id)}
									onblur={(e) => {
										passport.setNote(item.id, e.currentTarget.value);
										editing = null;
									}}
									{@attach (el) => el.focus()}
								></textarea>
							{:else if passport.getNote(item.id)}
								<button class="note" onclick={() => toggleNote(item.id)}>
									{passport.getNote(item.id)}
								</button>
							{:else}
								<button class="add-note pixel" onclick={() => toggleNote(item.id)}>
									+ Add note
								</button>
							{/if}
						</li>
					{/each}
				</ul>

				{#if hidden > 0}
					<button class="more pixel" onclick={() => (showAll = !showAll)}>
						{showAll ? 'Show fewer' : `View all ${passport.timeline.length}`}
					</button>
				{/if}
			{/if}
		</section>
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
		padding-bottom: var(--safe-bottom);
	}
	.body {
		max-width: 620px;
		margin: 0 auto;
		padding: 1.4rem 1.1rem calc(var(--safe-bottom) + 90px);
		display: flex;
		flex-direction: column;
		gap: 2.2rem;
	}

	/* Everything here is borderless: type and spacing carry the structure. */
	.score {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.count {
		display: flex;
		align-items: baseline;
		gap: 0.7rem;
		flex-wrap: wrap;
		margin: 0;
	}
	.num {
		font-size: 2.4rem;
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
		gap: 3px;
	}
	.meter i {
		flex: 1;
		height: 10px;
		background: rgba(247, 239, 227, 0.1);
	}
	.meter i.on {
		background: var(--tim-red);
		box-shadow: inset 0 2px 0 #f0555b;
	}
	.line {
		margin: 0;
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--cream-dim);
	}
	.line strong {
		color: var(--cream);
	}
	.share {
		align-self: flex-start;
	}

	.section-title {
		font-size: 0.58rem;
		color: var(--gold);
		margin: 0 0 1rem;
	}

	.stamps {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.stamps li {
		padding: 0.75rem 0;
		border-bottom: 1px solid rgba(247, 239, 227, 0.1);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 0.85rem;
	}
	.stamps li:last-child {
		border-bottom: none;
	}
	.info {
		flex: 1;
		min-width: 0;
	}
	.info strong {
		display: block;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--cream);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.info small {
		color: var(--cream-dim);
		font-size: 0.8rem;
	}
	.stamps time {
		flex: none;
		font-size: 0.75rem;
		color: var(--cream-dim);
	}

	/* Notes: quiet until there is one, then plain readable text. */
	.add-note,
	.note {
		display: block;
		margin: 0.5rem 0 0 2.05rem;
		padding: 0.2rem 0;
		text-align: left;
	}
	.add-note {
		font-size: 0.42rem;
		color: var(--cream-faint);
	}
	.add-note:hover {
		color: var(--gold);
	}
	.note {
		font-size: 0.88rem;
		line-height: 1.45;
		color: var(--cream-dim);
		border-bottom: 1px dashed rgba(247, 239, 227, 0.2);
	}
	.note:hover {
		color: var(--cream);
	}
	.stamps textarea {
		width: calc(100% - 2.05rem);
		margin: 0.5rem 0 0 2.05rem;
		padding: 0.6rem;
		font-family: var(--font-sans);
		font-size: 0.9rem;
		resize: none;
		background: var(--screen-deep);
		color: var(--cream);
		border-top: 2px solid var(--cabinet-lo);
		border-left: 2px solid var(--cabinet-lo);
		border-right: 2px solid var(--cabinet-hi);
		border-bottom: 2px solid var(--cabinet-hi);
	}
	.stamps textarea:focus {
		outline: 3px solid var(--gold);
	}

	.more {
		margin-top: 1rem;
		padding: 0.5rem 0;
		font-size: 0.5rem;
		color: var(--gold);
		border-bottom: 2px solid rgba(242, 177, 52, 0.35);
	}
	.more:hover {
		border-bottom-color: var(--gold);
	}

	.empty {
		margin: 0 0 1.1rem;
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--cream-dim);
	}
</style>

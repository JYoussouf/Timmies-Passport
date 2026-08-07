<script lang="ts">
	import { onMount } from 'svelte';
	import { APP_NAME_OWNED } from '$lib/brand';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import CupIcon from '$lib/components/CupIcon.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { shareModal } from '$lib/stores/shareModal.svelte';
	import { locationLabel, locationPlace } from '$lib/location';

	onMount(() => {
		passport.hydrate();
		locations.load();
	});

	const pct = $derived(
		locations.total ? ((passport.count / locations.total) * 100).toFixed(2) : '0'
	);

	/** Notes live here rather than on the map, where they interrupted a check-in. */
	let editing = $state<string | null>(null);
	let noteEl = $state<HTMLTextAreaElement>();
	function toggleNote(id: string) {
		editing = editing === id ? null : id;
	}
	function saveNote(id: string) {
		if (noteEl) passport.setNote(id, noteEl.value);
		editing = null;
	}

	const countries = $derived(passport.countriesVisited.size);
	const countryTotal = $derived(locations.countryTotal);
	const provinces = $derived(passport.provincesVisited.size);
	const provinceTotal = $derived(locations.provinceTotal);

	/** Width for a fill bar - never past 100%, never negative on a zero total. */
	const barPct = (n: number, total: number) => (total > 0 ? Math.min(100, (n / total) * 100) : 0);

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
			<!--
				Three bars instead of one meter, so a glance answers three
				different questions rather than one. Each waits for its own
				first fact, the same as the desktop legend's chips: a brand new
				passport has 0% of nothing, and a countries bar sitting at zero
				reads as a stat rather than an invitation. The Timmies bar is
				the one exception - it is the headline number's own bar, so it
				stays even at zero.
			-->
			<div class="bars">
				<div class="bar-row">
					<div class="bar-label">
						<span>Timmies</span>
						<span class="bar-count">
							{passport.count.toLocaleString()} / {locations.total.toLocaleString()}
							<span class="bar-pct">· {pct}%</span>
						</span>
					</div>
					<div class="bar-track">
						<div class="bar-fill timmies" style="width: {barPct(passport.count, locations.total)}%"></div>
					</div>
				</div>
				{#if countries > 0}
					<div class="bar-row">
						<div class="bar-label">
							<span>Countries</span>
							<span class="bar-count">{countries} / {countryTotal}</span>
						</div>
						<div class="bar-track">
							<div class="bar-fill countries" style="width: {barPct(countries, countryTotal)}%"></div>
						</div>
					</div>
				{/if}
				{#if provinces > 0}
					<div class="bar-row">
						<div class="bar-label">
							<span>Provinces</span>
							<span class="bar-count">{provinces} / {provinceTotal}</span>
						</div>
						<div class="bar-track">
							<div class="bar-fill provinces" style="width: {barPct(provinces, provinceTotal)}%"></div>
						</div>
					</div>
				{/if}
			</div>

			<button class="pbtn pbtn-gold share" onclick={() => shareModal.start()}>
				Share my passport
			</button>
		</section>

		<section>
			<h2 class="section-title">Recent stamps</h2>

			{#if passport.count === 0}
				<p class="empty">No stamps yet. Open the map and check in to your first Timmies.</p>
				<a class="pbtn pbtn-primary" href="/">Go to map</a>
			{:else}
				<ul class="stamps">
					{#each passport.timeline as item (item.id)}
						<li>
							<div class="row">
								<CupIcon height={20} />
								<div class="info">
									<strong>{locationLabel(locations.get(item.id))}</strong>
									<small>{locationPlace(locations.get(item.id))}</small>
								</div>
								<time>{fmt(item.visit.visitedAt)}</time>
							</div>

							{#if editing === item.id}
								<div class="note-edit">
									<textarea
										bind:this={noteEl}
										rows="2"
										placeholder="Apple fritter and a double-double!"
										value={passport.getNote(item.id)}
										onkeydown={(e) => {
											if (e.key === 'Enter' && !e.shiftKey) {
												e.preventDefault();
												saveNote(item.id);
											}
										}}
										onblur={(e) => {
											passport.setNote(item.id, e.currentTarget.value);
											editing = null;
										}}
										{@attach (el) => el.focus()}
									></textarea>
									<!-- pointerdown is swallowed so the textarea's blur - which
									     also saves - cannot close the editor before this click
									     lands; the button then does the save deterministically. -->
									<button
										class="pbtn pbtn-gold note-save"
										onpointerdown={(e) => e.preventDefault()}
										onclick={() => saveNote(item.id)}
									>
										Save note
									</button>
								</div>
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
	.bars {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}
	.bar-row {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.bar-label {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		font-size: 0.78rem;
		color: var(--cream-dim);
	}
	.bar-count {
		color: var(--cream);
		font-variant-numeric: tabular-nums;
	}
	.bar-pct {
		color: var(--cream-dim);
	}
	.bar-track {
		height: 10px;
		background: rgba(247, 239, 227, 0.1);
	}
	.bar-fill {
		height: 100%;
		/* A bar that has to snap into place on every check-in reads as jumpy;
		   this is the one motion on the page slow enough to actually see. */
		transition: width 0.5s var(--ease-out);
	}
	.bar-fill.timmies {
		background: var(--tim-red);
		box-shadow: inset 0 2px 0 #f0555b;
	}
	.bar-fill.countries {
		background: var(--green);
		box-shadow: inset 0 2px 0 #7cf08d;
	}
	.bar-fill.provinces {
		background: var(--gold);
		box-shadow: inset 0 2px 0 #ffd479;
	}
	.share {
		align-self: flex-start;
	}

	.section-title {
		font-size: 0.58rem;
		color: var(--gold);
		margin: 0 0 1rem;
	}

	/*
	 * Scrolls rather than paginating behind a "view all" - a list worth having
	 * is a list you can scroll, and a click that only ever reveals more of the
	 * same page never needed to be a click. Capped at roughly five rows before
	 * it scrolls, tight enough that recent stamps read as a list, not a slide
	 * show one row per screen.
	 */
	.stamps {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 320px;
		overflow-y: auto;
	}
	.stamps li {
		padding: 0.45rem 0;
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
	/* The editor: box on top, its confirm sitting bottom-right beneath it. */
	.note-edit {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.45rem;
		margin: 0.5rem 0 0 2.05rem;
	}
	.stamps textarea {
		width: 100%;
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
	/* A quieter cousin of the full-size pbtn - a note is not a check-in. */
	.note-save {
		min-height: 34px;
		padding: 0.45rem 0.85rem;
		font-size: 0.45rem;
	}

	.empty {
		margin: 0 0 1.1rem;
		font-size: 0.95rem;
		line-height: 1.5;
		color: var(--cream-dim);
	}
</style>

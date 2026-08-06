<script lang="ts">
	/**
	 * Credits and the affiliation disclaimer.
	 *
	 * The map's attribution bar carries the short version on every screen; this
	 * is the long form, where the licences that the data actually carries can be
	 * stated properly rather than compressed into a footer.
	 */
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { APP_NAME, REPO_URL } from '$lib/brand';
	import BottomNav from '$lib/components/BottomNav.svelte';

	const sources = [
		{
			name: 'OpenStreetMap',
			href: 'https://www.openstreetmap.org/copyright',
			used: 'where the stores are',
			licence: 'ODbL 1.0'
		},
		{
			name: 'All The Places',
			href: 'https://www.alltheplaces.xyz/',
			used: "which stores the brand still lists",
			licence: 'CC0 1.0'
		},
		{
			name: 'Natural Earth',
			href: 'https://www.naturalearthdata.com/',
			used: 'boundaries and the place gazetteer',
			licence: 'public domain'
		},
		{
			name: 'Nominatim',
			href: 'https://nominatim.org/',
			used: 'addresses missing from OSM',
			licence: 'ODbL 1.0'
		},
		{
			name: 'CARTO',
			href: 'https://carto.com/basemaps/',
			used: 'basemap tiles',
			licence: 'CARTO basemap terms'
		}
	];
</script>

<svelte:head><title>About - {APP_NAME}</title></svelte:head>

<div class="page">
	<PageHeader title="About" />

	<div class="body">
		<section>
			<p class="lead">
				MyTimmiesPassport is a fanmade hobby project for tracking Tim Hortons locations visited across the world! Everything
				lives on your device until you sign up.
			</p>
			<p class="disclaim">
				Not affiliated with, endorsed by, or sponsored by Tim Hortons or Restaurant
				Brands International. "Tim Hortons" is their trademark, used here only to
				refer to their restaurants.
			</p>
		</section>

		<section>
			<h2 class="section-title">Data Sources and Credit</h2>
			<ul class="sources">
				{#each sources as s (s.name)}
					<li>
						<a href={s.href} target="_blank" rel="noopener noreferrer">{s.name}</a>
						<small>{s.used}</small>
						<span class="licence pixel">{s.licence}</span>
					</li>
				{/each}
			</ul>
			<h2 class="section-title">Type and art</h2>
			<p class="note">
				Press Start 2P by CodeMan38 and Inter by Rasmus Andersson, both under the SIL
				Open Font License. The coffee cup was drawn for this project.
			</p>
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
		gap: 2rem;
	}
	.lead {
		margin: 0 0 1rem;
		font-size: 1rem;
		line-height: 1.55;
		color: var(--cream);
	}
	/* The point of the page: set apart so it cannot be skimmed past. */
	.disclaim {
		margin: 0;
		padding: 0.9rem 1rem;
		font-size: 0.88rem;
		line-height: 1.55;
		color: var(--cream-dim);
		background: var(--screen-deep);
	}
	.section-title {
		font-size: 0.58rem;
		color: var(--gold);
		margin: 0 0 1rem;
	}
	.sources {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.sources li {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding: 0.7rem 0;
		border-bottom: 1px solid rgba(247, 239, 227, 0.1);
	}
	.sources li:last-child {
		border-bottom: none;
	}
	.sources a {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--cream);
	}
	.sources small {
		flex: 1;
		min-width: 8rem;
		font-size: 0.82rem;
		color: var(--cream-dim);
	}
	.licence {
		font-size: 0.4rem;
		color: var(--cream-dim);
	}
	.note {
		margin: 1rem 0 0;
		font-size: 0.88rem;
		line-height: 1.55;
		color: var(--cream-dim);
	}
	.sources a {
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.note :global(a) {
		color: var(--gold);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
</style>

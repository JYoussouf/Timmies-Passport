<script lang="ts">
	/**
	 * Shown only when the app is being served from somewhere that is not its
	 * real home - the pages.dev address, a preview deployment, or localhost.
	 *
	 * Both addresses serve and will keep serving, so somebody who followed an
	 * old link has no way of knowing they are on the spare one. This tells
	 * them, and hands them the real address rather than just naming it.
	 *
	 * Dismissable, because a developer working on localhost should be able to
	 * make it go away and see the layout underneath.
	 */
	import { onMount } from 'svelte';
	import { SITE_URL } from '$lib/brand';

	const HOME_HOST = new URL(SITE_URL).host;

	let show = $state(false);
	let dismissed = $state(false);
	let el = $state<HTMLDivElement>();

	onMount(() => {
		/* www is the same site, and is redirected to the apex at the edge. */
		const here = location.host.replace(/^www\./, '');
		show = here !== HOME_HOST;
	});

	/*
	 * Reserve the strip's height at the root rather than covering what is
	 * underneath. Measured, not assumed, because the text wraps to two lines
	 * on a narrow enough screen.
	 */
	$effect(() => {
		const root = document.documentElement;
		if (!el || dismissed) {
			root.style.removeProperty('--dev-badge-h');
			return;
		}
		const sync = () => root.style.setProperty('--dev-badge-h', `${el!.offsetHeight}px`);
		sync();
		const ro = new ResizeObserver(sync);
		ro.observe(el);
		return () => {
			ro.disconnect();
			root.style.removeProperty('--dev-badge-h');
		};
	});
</script>

{#if show && !dismissed}
	<div class="badge pixel" role="status" bind:this={el}>
		<span class="text">
			You found my dev version! Go to
			<a href={SITE_URL}>mytimmiespassport.com</a>
		</span>
		<button class="x" aria-label="Dismiss" onclick={() => (dismissed = true)}>×</button>
	</div>
{/if}

<style>
	/*
	 * A full-width strip along the very top rather than a floating box.
	 * Centred, it landed on the stamp counter and the sign-in prompt; edge to
	 * edge it covers only the title bar, which is the one thing on screen that
	 * repeats what the badge already says.
	 */
	.badge {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.4rem;
		padding: calc(env(safe-area-inset-top, 0px) + 0.4rem) 0.5rem 0.4rem;
		font-size: 0.36rem;
		line-height: 1.6;
		color: var(--cabinet-lo);
		background: var(--gold);
		border-bottom: 2px solid var(--gold-deep);
	}
	.text {
		min-width: 0;
		text-align: center;
	}
	a {
		color: var(--cabinet-lo);
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.x {
		flex: none;
		width: 22px;
		height: 22px;
		font-size: 0.85rem;
		line-height: 1;
		color: var(--cabinet-lo);
		background: rgba(0, 0, 0, 0.12);
		border: none;
	}
	.x:hover {
		background: rgba(0, 0, 0, 0.24);
	}
</style>

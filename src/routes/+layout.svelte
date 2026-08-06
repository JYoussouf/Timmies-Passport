<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import AuthModal from '$lib/components/AuthModal.svelte';
	import ReportDialog from '$lib/components/ReportDialog.svelte';
	import DevBadge from '$lib/components/DevBadge.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { SITE_URL } from '$lib/brand';
	import { page } from '$app/stores';

	let { children } = $props();

	/*
	 * The site answers on both the domain and the pages.dev address, and will
	 * keep doing so - links to the latter are already out there. Declaring one
	 * canonical home stops search engines treating them as two sites competing
	 * with each other.
	 *
	 * This tag only exists once JavaScript has run, which is too late for a
	 * crawler that does not execute it. static/_headers carries the same
	 * statement as a Link header on the response itself and is what actually
	 * does the work; this covers in-app navigation, where no new response is
	 * fetched to carry a header.
	 */
	const canonical = $derived(`${SITE_URL}${$page.url.pathname}`.replace(/\/$/, '') || SITE_URL);

	onMount(() => {
		passport.hydrate();
		settings.hydrate();
		auth.init();

		/*
		 * Stop the browser zooming the page on a pinch.
		 *
		 * Two mobile complaints share this cause. Pinching anywhere near the
		 * chrome zoomed the whole document instead of the map, and the first
		 * pinch-out on the map did nothing because Safari consumed it as a page
		 * gesture - only once the page was already scaled did the map start
		 * receiving them.
		 *
		 * `maximum-scale=1` in the viewport tag has been ignored by iOS since
		 * Safari 10, so the gesture events have to be refused directly. MapLibre
		 * reads raw touch events on its canvas, so its own pinch is unaffected.
		 */
		const refuse = (e: Event) => e.preventDefault();
		const gestures = ['gesturestart', 'gesturechange', 'gestureend'];
		for (const type of gestures) document.addEventListener(type, refuse, { passive: false });

		return () => {
			for (const type of gestures) document.removeEventListener(type, refuse);
		};
	});
</script>

<svelte:head>
	<link rel="canonical" href={canonical} />
</svelte:head>

{@render children()}

<Toaster />
<AuthModal />
<ReportDialog />
<DevBadge />

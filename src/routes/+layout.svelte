<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import Toaster from '$lib/components/Toaster.svelte';
	import AuthModal from '$lib/components/AuthModal.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { auth } from '$lib/stores/auth.svelte';

	let { children } = $props();

	onMount(() => {
		passport.hydrate();
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

{@render children()}

<Toaster />
<AuthModal />

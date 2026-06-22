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
	});
</script>

{@render children()}

<Toaster />
<AuthModal />

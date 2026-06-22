<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	let { title }: { title: string } = $props();
</script>

<header class="ph">
	<a class="brand" href="/" aria-label="Back to map">
		<span class="logo" aria-hidden="true"></span>
	</a>
	<h1>{title}</h1>
	{#if auth.signedIn}
		<button class="avatar" onclick={() => auth.logout()} title="Sign out">
			{auth.user!.displayName.slice(0, 1).toUpperCase()}
		</button>
	{:else}
		<button class="signin" onclick={() => ui.openAuth('login')}>Sign in</button>
	{/if}
</header>

<style>
	.ph {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: calc(var(--safe-top) + 0.85rem) 1rem 0.85rem;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--line);
	}
	.brand {
		flex: none;
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: var(--surface);
		box-shadow: var(--shadow-sm);
	}
	.logo {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 35%, var(--tim-red) 0 55%, var(--espresso) 56%);
	}
	h1 {
		flex: 1;
		font-size: 1.25rem;
	}
	.avatar,
	.signin {
		flex: none;
		height: 38px;
		border-radius: 999px;
		display: grid;
		place-items: center;
	}
	.avatar {
		width: 38px;
		background: var(--espresso);
		color: var(--cream);
		font-weight: 800;
	}
	.signin {
		padding: 0 1rem;
		font-weight: 700;
		font-size: 0.85rem;
		color: var(--accent);
		background: var(--surface);
		box-shadow: var(--shadow-sm);
	}
</style>

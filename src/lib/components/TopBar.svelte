<script lang="ts">
	import { passport } from '$lib/stores/passport.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { ui } from '$lib/stores/ui.svelte';

	let { onsearch }: { onsearch: () => void } = $props();

	/** Collection progress, quantised into 10 segments for the pixel meter. */
	const pct = $derived(
		locations.total ? Math.min(100, (passport.count / locations.total) * 100) : 0
	);
	const lit = $derived(Math.min(10, Math.ceil((pct / 100) * 10)));
	const segments = Array.from({ length: 10 }, (_, i) => i);
</script>

<header class="bar">
	<a class="brand" href="/" aria-label="Timmies Passport home">
		<span class="logo" aria-hidden="true"></span>
		<span class="name pixel">Timmies</span>
	</a>

	<div class="right">
		<div
			class="meter"
			title="{passport.count} of {locations.total} locations collected"
			role="img"
			aria-label="{passport.count} of {locations.total} locations collected"
		>
			<span class="segs" aria-hidden="true">
				{#each segments as i (i)}
					<i class:on={i < lit}></i>
				{/each}
			</span>
			<span class="count pixel">{passport.count}</span>
		</div>

		<button class="icon" aria-label="Search locations" onclick={onsearch}>
			<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"
				><path
					d="M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z"
					fill="none"
					stroke="currentColor"
					stroke-width="2.6"
					stroke-linecap="square"
				/></svg
			>
		</button>

		{#if auth.signedIn}
			<button class="avatar pixel" aria-label="Sign out" onclick={() => auth.logout()}>
				{auth.user!.displayName.slice(0, 1).toUpperCase()}
			</button>
		{:else}
			<button class="signin pixel" onclick={() => ui.openAuth('login')}>Sign in</button>
		{/if}
	</div>
</header>

<style>
	.bar {
		position: absolute;
		top: calc(var(--safe-top) + 10px);
		left: 10px;
		right: 10px;
		z-index: 30;
		display: flex;
		align-items: stretch;
		justify-content: space-between;
		gap: 0.5rem;
		pointer-events: none;
	}
	.brand,
	.right {
		pointer-events: auto;
		display: flex;
		align-items: center;
		background: var(--cabinet);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md);
	}
	.brand {
		gap: 0.5rem;
		padding: 0 0.7rem 0 0.5rem;
		min-height: 44px;
		text-decoration: none;
		color: var(--cream);
	}
	/* A donut: red ring, hole punched out. Hard steps, like the map sprites. */
	.logo {
		width: 18px;
		height: 18px;
		flex: none;
		background: var(--cabinet);
		box-shadow: inset 0 0 0 5px var(--tim-red);
	}
	.name {
		font-size: 0.6rem;
		color: var(--gold);
	}
	@media (max-width: 400px) {
		.name {
			display: none;
		}
		.brand {
			padding: 0 0.5rem;
		}
	}

	.right {
		gap: 0.3rem;
		padding: 0.25rem;
	}
	.meter {
		display: flex;
		flex-direction: column;
		gap: 3px;
		justify-content: center;
		padding: 0 0.5rem 0 0.4rem;
	}
	.segs {
		display: flex;
		gap: 2px;
	}
	.segs i {
		width: 4px;
		height: 8px;
		background: rgba(247, 239, 227, 0.16);
	}
	.segs i.on {
		background: var(--gold);
	}
	.count {
		font-size: 0.55rem;
		color: var(--cream);
		line-height: 1;
	}

	.icon,
	.avatar,
	.signin {
		display: grid;
		place-items: center;
		min-height: 40px;
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		background: var(--surface-2);
		transition: background 0.12s linear;
	}
	.icon:active,
	.avatar:active,
	.signin:active {
		transform: translate(2px, 2px);
	}
	.icon {
		width: 40px;
		color: var(--cream);
	}
	.icon:hover {
		background: var(--cabinet-hi);
	}
	.avatar {
		width: 40px;
		background: var(--tim-red);
		color: #fff;
		font-size: 0.6rem;
	}
	.signin {
		padding: 0 0.7rem;
		font-size: 0.5rem;
		color: var(--gold);
	}
	.signin:hover {
		background: var(--cabinet-hi);
	}
</style>

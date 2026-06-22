<script lang="ts">
	import { passport } from '$lib/stores/passport.svelte';
	import { locations } from '$lib/stores/locations.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { ui } from '$lib/stores/ui.svelte';

	let { onsearch }: { onsearch: () => void } = $props();

	const pct = $derived(
		locations.total ? Math.min(100, (passport.count / locations.total) * 100) : 0
	);
</script>

<header class="bar">
	<a class="brand" href="/" aria-label="Timmies Passport home">
		<span class="logo" aria-hidden="true"></span>
		<span class="name">Timmies&nbsp;Passport</span>
	</a>

	<div class="right">
		<div class="progress" title="{passport.count} of {locations.total} locations collected">
			<svg viewBox="0 0 36 36" class="ring" aria-hidden="true">
				<circle class="track" cx="18" cy="18" r="15.5" />
				<circle
					class="fill"
					cx="18"
					cy="18"
					r="15.5"
					style="stroke-dashoffset: {97.4 - (97.4 * pct) / 100}"
				/>
			</svg>
			<span class="count">{passport.count}</span>
		</div>

		<button class="icon" aria-label="Search locations" onclick={onsearch}>
			<svg viewBox="0 0 24 24" width="20" height="20"
				><path
					d="M21 21l-4.3-4.3M11 19a8 8 0 110-16 8 8 0 010 16z"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
				/></svg
			>
		</button>

		{#if auth.signedIn}
			<button class="avatar" aria-label="Account" onclick={() => auth.logout()}>
				{auth.user!.displayName.slice(0, 1).toUpperCase()}
			</button>
		{:else}
			<button class="signin" onclick={() => ui.openAuth('login')}>Sign in</button>
		{/if}
	</div>
</header>

<style>
	.bar {
		position: fixed;
		top: calc(var(--safe-top) + 10px);
		left: 10px;
		right: 10px;
		z-index: 30;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.6rem;
		pointer-events: none;
	}
	.brand,
	.right {
		pointer-events: auto;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: var(--surface);
		padding: 0.45rem 0.85rem 0.45rem 0.55rem;
		border-radius: 999px;
		box-shadow: var(--shadow-md);
		text-decoration: none;
		color: var(--ink);
	}
	.logo {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 35%, var(--tim-red) 0 55%, var(--espresso) 56%);
	}
	.name {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 0.92rem;
		letter-spacing: -0.01em;
	}
	@media (max-width: 380px) {
		.name {
			display: none;
		}
	}
	.right {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		background: var(--surface);
		padding: 0.35rem;
		border-radius: 999px;
		box-shadow: var(--shadow-md);
	}
	.progress {
		position: relative;
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
	}
	.ring {
		position: absolute;
		inset: 0;
		transform: rotate(-90deg);
	}
	.ring .track {
		fill: none;
		stroke: var(--cream-deep);
		stroke-width: 3;
	}
	.ring .fill {
		fill: none;
		stroke: var(--accent);
		stroke-width: 3;
		stroke-linecap: round;
		stroke-dasharray: 97.4;
		transition: stroke-dashoffset 0.6s var(--ease-out);
	}
	.count {
		font-weight: 800;
		font-size: 0.8rem;
		color: var(--ink);
	}
	.icon,
	.avatar,
	.signin {
		display: grid;
		place-items: center;
		height: 38px;
		border-radius: 999px;
	}
	.icon {
		width: 38px;
		color: var(--coffee);
	}
	.icon:hover {
		background: var(--surface-2);
	}
	.avatar {
		width: 38px;
		background: var(--espresso);
		color: var(--cream);
		font-weight: 800;
	}
	.signin {
		padding: 0 0.9rem;
		font-weight: 700;
		font-size: 0.85rem;
		color: var(--accent);
	}
</style>

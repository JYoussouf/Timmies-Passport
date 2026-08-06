<script lang="ts">
	import { auth } from '$lib/stores/auth.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import CupIcon from './CupIcon.svelte';
	let { title }: { title: string } = $props();
</script>

<header class="ph">
	<a class="back" href="/" aria-label="Back to map">
		<CupIcon height={22} />
	</a>
	<h1 class="pixel">{title}</h1>
	{#if auth.signedIn}
		<button class="avatar pixel" onclick={() => auth.logout()} aria-label="Sign out">
			{auth.user!.displayName.slice(0, 1).toUpperCase()}
		</button>
	{:else}
		<button class="signin pixel" onclick={() => ui.openAuth('signup')}>Sign in to save your progress</button>
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
		padding: calc(var(--safe-top) + 0.7rem) 0.85rem 0.7rem;
		background: var(--cabinet);
		border-bottom: 3px solid var(--cabinet-lo);
		box-shadow: inset 0 3px 0 var(--cabinet-hi);
	}
	.back {
		flex: none;
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		background: var(--surface-2);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.back:active {
		transform: translate(2px, 2px);
	}
	/* Wraps rather than truncates: a clipped "Your Timmies..." tells the user
	   less than a two-line title does. */
	h1 {
		flex: 1;
		min-width: 0;
		font-size: 0.62rem;
		line-height: 1.6;
		color: var(--gold);
	}
	@media (min-width: 560px) {
		h1 {
			font-size: 0.7rem;
		}
	}
	.avatar,
	.signin {
		flex: none;
		min-height: 44px;
		display: grid;
		place-items: center;
		background: var(--surface-2);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.avatar:active,
	.signin:active {
		transform: translate(2px, 2px);
	}
	.avatar {
		width: 44px;
		background: var(--tim-red);
		color: #fff;
		font-size: 0.6rem;
	}
	.signin {
		max-width: 42%;
		padding: 0.45rem 0.7rem;
		font-size: 0.46rem;
		line-height: 1.8;
		text-align: center;
		color: var(--gold);
	}
</style>

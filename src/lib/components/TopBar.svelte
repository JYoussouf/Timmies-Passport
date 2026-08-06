<script lang="ts">
	/**
	 * The brand plate doubles as the score readout. A separate floating counter
	 * over the map competed with the markers for attention; folded into the
	 * corner it stays available without sitting in the middle of the screen.
	 */
	import { auth } from '$lib/stores/auth.svelte';
	import { ui } from '$lib/stores/ui.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import CupIcon from './CupIcon.svelte';
	import AccountMenu from './AccountMenu.svelte';
</script>

<header class="bar">
	<a class="brand" href="/passport" aria-label="{passport.count} stamps collected. Open your passport.">
		<CupIcon height={24} />
		<span class="score">
			<span class="num pixel">{passport.count.toLocaleString()}</span>
			<span class="cap pixel">stamped</span>
		</span>
	</a>

	{#if auth.signedIn}
		<AccountMenu />
	{:else}
		<button class="signin pixel" onclick={() => ui.openAuth('login')}>
			Sign in to save your progress
		</button>
	{/if}
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
	.signin {
		pointer-events: auto;
		background: var(--cabinet);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0 0.55rem 0 0.4rem;
		/* Trimmed from 44px. Both chips overlay the map, and on a phone every
		   row they give back is map. Still comfortably past the 24px minimum
		   for a touch target, and the sign-in chip is the only one that is one. */
		min-height: 36px;
		text-decoration: none;
		color: var(--cream);
	}
	.score {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.num {
		font-size: 0.6rem;
		line-height: 1;
		color: var(--gold);
	}
	.cap {
		font-size: 0.34rem;
		line-height: 1;
		color: var(--cream-dim);
	}

	.signin {
		display: grid;
		place-items: center;
		min-height: 36px;
		color: var(--gold);
		transition: background 0.12s linear;
	}
	.signin:hover {
		background: var(--cabinet-hi);
	}
	.signin:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.signin {
		max-width: 64%;
		padding: 0.45rem 0.75rem;
		font-size: 0.5rem;
		line-height: 1.8;
		text-align: center;
	}

	@media (min-width: 900px) {
		.signin {
			font-size: 0.58rem;
			padding: 0.45rem 1.1rem;
		}
	}
</style>

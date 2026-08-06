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
</script>

<header class="bar">
	<a class="brand" href="/passport" aria-label="{passport.count} stamps collected. Open your passport.">
		<CupIcon size={24} outline="var(--tim-red)" fill="var(--cream)" />
		<span class="score">
			<span class="num pixel">{passport.count.toLocaleString()}</span>
			<span class="cap pixel">stamped</span>
		</span>
	</a>

	{#if auth.signedIn}
		<button class="avatar pixel" aria-label="Sign out" onclick={() => auth.logout()}>
			{auth.user!.displayName.slice(0, 1).toUpperCase()}
		</button>
	{:else}
		<button class="signin pixel" onclick={() => ui.openAuth('signup')}>
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
	.avatar,
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
		gap: 0.5rem;
		padding: 0 0.7rem 0 0.5rem;
		min-height: 44px;
		text-decoration: none;
		color: var(--cream);
	}
	.score {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.num {
		font-size: 0.72rem;
		line-height: 1;
		color: var(--gold);
	}
	.cap {
		font-size: 0.4rem;
		line-height: 1;
		color: var(--cream-dim);
	}

	.avatar,
	.signin {
		display: grid;
		place-items: center;
		min-height: 44px;
		color: var(--gold);
		transition: background 0.12s linear;
	}
	.avatar:hover,
	.signin:hover {
		background: var(--cabinet-hi);
	}
	.avatar:active,
	.signin:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.avatar {
		width: 44px;
		background: var(--tim-red);
		color: #fff;
		font-size: 0.6rem;
	}
	.signin {
		max-width: 62%;
		padding: 0.4rem 0.7rem;
		font-size: 0.42rem;
		line-height: 1.7;
		text-align: center;
	}

	@media (min-width: 900px) {
		.signin {
			font-size: 0.5rem;
			padding: 0.4rem 1rem;
		}
	}
</style>

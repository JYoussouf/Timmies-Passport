<script lang="ts">
	/**
	 * The avatar opens a menu rather than signing you out on the spot.
	 *
	 * Signing out is destructive on a local-first app - an unlabelled one-tap
	 * button that logs you out is a trap, so it now sits behind a menu that also
	 * tells you which account you are in.
	 */
	import { auth } from '$lib/stores/auth.svelte';

	let open = $state(false);
	let root = $state<HTMLDivElement>();

	const user = $derived(auth.user);
	const initial = $derived((user?.displayName || '?').slice(0, 1).toUpperCase());

	$effect(() => {
		if (!open) return;
		const onDown = (e: PointerEvent) => {
			if (root && !root.contains(e.target as Node)) open = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') open = false;
		};
		document.addEventListener('pointerdown', onDown);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', onDown);
			document.removeEventListener('keydown', onKey);
		};
	});

	function signOut() {
		open = false;
		auth.logout();
	}
</script>

<div class="account" bind:this={root}>
	<button
		class="avatar pixel"
		class:on={open}
		aria-expanded={open}
		aria-haspopup="menu"
		aria-label="Account"
		onclick={() => (open = !open)}
	>
		{initial}
	</button>

	{#if open}
		<div class="menu" role="menu">
			<p class="who">
				<strong>{user?.displayName}</strong>
				<small>{user?.email}</small>
			</p>
			<button class="item pixel" role="menuitem" onclick={signOut}>Sign out</button>
		</div>
	{/if}
</div>

<style>
	.account {
		position: relative;
		pointer-events: auto;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 44px;
		min-height: 44px;
		font-size: 0.6rem;
		color: #fff;
		background: var(--tim-red);
		border-top: 2px solid #f0555b;
		border-left: 2px solid #f0555b;
		border-right: 2px solid #7d1216;
		border-bottom: 2px solid #7d1216;
		box-shadow: var(--bevel-md);
	}
	.avatar:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	.avatar.on {
		background: var(--tim-red-deep);
	}

	/* Opens downward: the avatar lives in the top bar. */
	.menu {
		position: absolute;
		top: calc(100% + 6px);
		right: 0;
		min-width: 190px;
		background: var(--cabinet);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
		box-shadow: var(--bevel-md);
		transform-origin: top right;
		animation: pop 0.16s steps(3, end);
	}
	@keyframes pop {
		from {
			transform: scale(0.8);
			opacity: 0;
		}
	}
	.who {
		display: flex;
		flex-direction: column;
		gap: 3px;
		margin: 0;
		padding: 0.7rem 0.9rem;
		background: var(--screen-deep);
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.who strong {
		font-size: 0.9rem;
		color: var(--cream);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.who small {
		font-size: 0.76rem;
		color: var(--cream-dim);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.item {
		display: flex;
		align-items: center;
		width: 100%;
		min-height: 44px;
		padding: 0 0.9rem;
		font-size: 0.45rem;
		text-align: left;
		color: var(--gold);
	}
	.item:hover {
		background: var(--cabinet-hi);
		color: var(--cream);
	}
</style>

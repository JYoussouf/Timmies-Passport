<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { fade, scale } from 'svelte/transition';
	import CupIcon from './CupIcon.svelte';

	let email = $state('');
	let password = $state('');
	let displayName = $state('');
	let busy = $state(false);
	let error = $state('');

	const mode = $derived(ui.authMode);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		const res =
			mode === 'signup'
				? await auth.signup(email, password, displayName || email.split('@')[0])
				: await auth.login(email, password);
		busy = false;
		if (!res.ok) error = res.error ?? 'Something went wrong.';
	}
</script>

{#if ui.authOpen}
	<div class="overlay" transition:fade={{ duration: 160 }}>
		<button class="scrim" aria-label="Close" onclick={() => ui.closeAuth()}></button>
		<div class="modal" transition:scale={{ start: 0.96, duration: 200 }}>
			<div class="cap pixel">
				<CupIcon height={14} /> My Timmies Passport
			</div>
			<div class="inner">
				<h2 class="pixel">{mode === 'signup' ? 'Save your passport' : 'Welcome back'}</h2>
				<p class="sub">
					{mode === 'signup'
						? 'Sign up to sync your stamps across devices.'
						: 'Sign in to sync your stamps across devices.'}
				</p>

				<form onsubmit={submit}>
					{#if mode === 'signup'}
						<input
							type="text"
							placeholder="Display name"
							bind:value={displayName}
							autocomplete="nickname"
						/>
					{/if}
					<input type="email" placeholder="Email" bind:value={email} required autocomplete="email" />
					<input
						type="password"
						placeholder="Password"
						bind:value={password}
						required
						minlength="6"
						autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
					/>
					{#if error}<p class="err">{error}</p>{/if}
					<button class="pbtn pbtn-primary submit" type="submit" disabled={busy}>
						{busy ? 'One sec…' : mode === 'signup' ? 'Create passport' : 'Sign in'}
					</button>
				</form>

				<p class="switch">
					{#if mode === 'signup'}
						Already have a passport?
						<button class="pixel" onclick={() => (ui.authMode = 'login')}>Sign in instead</button>
					{:else}
						No passport yet?
						<button class="pixel" onclick={() => (ui.authMode = 'signup')}>Create one</button>
					{/if}
				</p>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 70;
		display: grid;
		place-items: center;
		padding: 1rem;
	}
	.scrim {
		position: absolute;
		inset: 0;
		background: rgba(11, 21, 36, 0.75);
		border: none;
	}
	.modal {
		position: relative;
		width: min(400px, 100%);
		max-height: calc(100dvh - 2rem);
		overflow-y: auto;
		background: var(--cabinet);
		border-top: 3px solid var(--cabinet-hi);
		border-left: 3px solid var(--cabinet-hi);
		border-right: 3px solid var(--cabinet-lo);
		border-bottom: 3px solid var(--cabinet-lo);
		box-shadow: var(--bevel-lg);
	}
	.cap {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.65rem 0.9rem;
		font-size: 0.45rem;
		color: var(--gold);
		background: var(--screen-deep);
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.inner {
		padding: 1.3rem 1.2rem 1.4rem;
	}
	h2 {
		font-size: 0.72rem;
		color: var(--cream);
	}
	.sub {
		margin: 0.7rem 0 1.2rem;
		color: var(--cream-dim);
		font-size: 0.9rem;
		line-height: 1.45;
	}
	input {
		width: 100%;
		min-height: 46px;
		padding: 0.75rem 0.8rem;
		margin-bottom: 0.6rem;
		font-family: var(--font-sans);
		font-size: 1rem;
		background: var(--screen-deep);
		color: var(--cream);
		border-top: 2px solid var(--cabinet-lo);
		border-left: 2px solid var(--cabinet-lo);
		border-right: 2px solid var(--cabinet-hi);
		border-bottom: 2px solid var(--cabinet-hi);
	}
	input::placeholder {
		color: var(--cream-faint);
	}
	input:focus {
		outline: 3px solid var(--gold);
		outline-offset: 0;
	}
	.submit {
		width: 100%;
		margin-top: 0.5rem;
	}
	.err {
		color: #ff8f94;
		font-size: 0.85rem;
		margin: 0 0 0.6rem;
	}
	.switch {
		text-align: center;
		margin: 1.1rem 0 0;
		font-size: 0.85rem;
		color: var(--cream-dim);
	}
	.switch button {
		display: inline-block;
		margin-top: 0.5rem;
		padding: 0.5rem 0.6rem;
		font-size: 0.45rem;
		color: var(--gold);
		background: var(--surface-2);
		border-top: 2px solid var(--cabinet-hi);
		border-left: 2px solid var(--cabinet-hi);
		border-right: 2px solid var(--cabinet-lo);
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.switch button:active {
		transform: translate(2px, 2px);
	}
</style>

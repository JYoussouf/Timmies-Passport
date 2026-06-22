<script lang="ts">
	import { ui } from '$lib/stores/ui.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { passport } from '$lib/stores/passport.svelte';
	import { fade, scale } from 'svelte/transition';

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
	<div class="overlay" transition:fade={{ duration: 200 }}>
		<button class="scrim" aria-label="Close" onclick={() => ui.closeAuth()}></button>
		<div class="modal card" transition:scale={{ start: 0.94, duration: 280 }}>
			<div class="brand"><span class="dot"></span> Timmies Passport</div>
			<h2>{mode === 'signup' ? 'Save your passport' : 'Welcome back'}</h2>
			<p class="sub">
				{mode === 'signup'
					? `Keep your ${passport.count} stamp${passport.count === 1 ? '' : 's'} forever and sync across devices.`
					: 'Sign in to load your collected Timmies.'}
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
				<input
					type="email"
					placeholder="Email"
					bind:value={email}
					required
					autocomplete="email"
				/>
				<input
					type="password"
					placeholder="Password"
					bind:value={password}
					required
					minlength="6"
					autocomplete={mode === 'signup' ? 'new-password' : 'current-password'}
				/>
				{#if error}<p class="err">{error}</p>{/if}
				<button class="btn btn-primary submit" type="submit" disabled={busy}>
					{busy ? 'One sec…' : mode === 'signup' ? 'Create passport' : 'Sign in'}
				</button>
			</form>

			<p class="switch">
				{#if mode === 'signup'}
					Already have one?
					<button onclick={() => (ui.authMode = 'login')}>Sign in</button>
				{:else}
					New here?
					<button onclick={() => (ui.authMode = 'signup')}>Create a passport</button>
				{/if}
			</p>
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
		background: rgba(43, 26, 20, 0.45);
		backdrop-filter: blur(3px);
		border: none;
	}
	.modal {
		position: relative;
		width: min(400px, 100%);
		padding: 1.6rem;
		background: var(--surface);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-weight: 700;
		font-size: 0.82rem;
		color: var(--coffee);
		letter-spacing: 0.02em;
	}
	.dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--accent);
		box-shadow: 0 0 0 3px rgba(216, 35, 42, 0.18);
	}
	h2 {
		margin: 0.7rem 0 0.3rem;
		font-size: 1.5rem;
	}
	.sub {
		margin: 0 0 1.1rem;
		color: var(--ink-soft);
		font-size: 0.92rem;
	}
	input {
		width: 100%;
		padding: 0.85rem 0.9rem;
		margin-bottom: 0.6rem;
		border: 1.5px solid var(--line);
		border-radius: var(--r-sm);
		font: inherit;
		background: var(--bg);
		color: var(--ink);
	}
	input:focus {
		outline: none;
		border-color: var(--caramel);
	}
	.submit {
		width: 100%;
		margin-top: 0.4rem;
	}
	.err {
		color: var(--tim-red-deep);
		font-size: 0.85rem;
		margin: 0 0 0.6rem;
	}
	.switch {
		text-align: center;
		margin: 1rem 0 0;
		font-size: 0.88rem;
		color: var(--ink-soft);
	}
	.switch button {
		font-weight: 700;
		color: var(--accent);
		text-decoration: underline;
	}
</style>

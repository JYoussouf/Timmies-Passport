<script lang="ts">
	/**
	 * Writes a report and files it as a GitHub issue on the reporter's behalf.
	 *
	 * Sending people to GitHub to file it themselves loses almost all of them:
	 * it needs an account, and the person who noticed a closed store is rarely
	 * carrying one. A text box costs them one sentence.
	 *
	 * If the endpoint is unconfigured or unreachable, the tracker link is shown
	 * instead of an apology, so the report still has somewhere to go.
	 */
	import { fade, scale } from 'svelte/transition';
	import { report } from '$lib/stores/report.svelte';
	import { REPO_URL } from '$lib/brand';
	import { ui } from '$lib/stores/ui.svelte';

	const MIN = 10;
	const MAX = 4000;

	let message = $state('');
	let busy = $state(false);
	let failure = $state('');
	/** Set when the failure is the server's, not the reporter's, so the fallback shows. */
	let offerFallback = $state(false);

	const ctx = $derived(report.context);
	const tooShort = $derived(message.trim().length < MIN);

	const heading = $derived(
		ctx?.kind === 'location' ? "What's wrong with this one?" : 'Report a bug'
	);
	const hint = $derived(
		ctx?.kind === 'location'
			? 'Permanently closed, wrong spot, wrong address - whatever you noticed.'
			: 'What happened, and what were you doing at the time?'
	);

	/** Prefilled tracker link, so a fallback does not mean retyping it all. */
	const fallbackUrl = $derived.by(() => {
		const title = ctx?.subject
			? `${ctx.kind === 'location' ? 'Location correction' : 'Bug report'}: ${ctx.subject}`
			: 'Bug report';
		return `${REPO_URL}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`;
	});

	function dismiss() {
		if (busy) return;
		report.close();
		message = '';
		failure = '';
		offerFallback = false;
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		if (tooShort || busy || !ctx) return;
		busy = true;
		failure = '';
		offerFallback = false;

		try {
			const res = await fetch('/api/report', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					kind: ctx.kind,
					message: message.trim(),
					subject: ctx.subject ?? '',
					storeId: ctx.storeId ?? ''
				})
			});

			if (res.ok) {
				const { number } = (await res.json()) as { number: number };
				dismiss();
				ui.toast({
					emoji: '📮',
					title: 'Report sent',
					body: `Thanks - it is issue #${number}.`
				});
				return;
			}

			const { message: detail } = (await res.json().catch(() => ({}))) as { message?: string };
			failure = detail || 'Could not send that report.';
			/* 4xx is something the reporter can fix; anything else is on us. */
			offerFallback = res.status >= 500 || res.status === 503;
		} catch {
			failure = 'No connection - your report was not sent.';
			offerFallback = true;
		} finally {
			busy = false;
		}
	}
</script>

{#if ctx}
	<div class="overlay" transition:fade={{ duration: 160 }}>
		<button class="scrim" aria-label="Close" onclick={dismiss}></button>
		<div class="modal" transition:scale={{ start: 0.96, duration: 200 }}>
			<div class="cap pixel">Report</div>
			<div class="inner">
				<h2 class="pixel">{heading}</h2>
				{#if ctx.subject}
					<p class="subject">{ctx.subject}</p>
				{/if}
				<p class="sub">{hint}</p>

				<form onsubmit={submit}>
					<!-- svelte-ignore a11y_autofocus -->
					<textarea
						bind:value={message}
						rows="5"
						maxlength={MAX}
						placeholder="Tell me what you saw..."
						autofocus
						aria-label="Your report"
					></textarea>

					{#if failure}
						<p class="err">{failure}</p>
						{#if offerFallback}
							<p class="err">
								<a href={fallbackUrl} target="_blank" rel="noopener noreferrer">
									File it on GitHub instead
								</a>
							</p>
						{/if}
					{/if}

					<div class="row">
						<button class="pbtn" type="button" onclick={dismiss} disabled={busy}>Cancel</button>
						<button class="pbtn pbtn-primary" type="submit" disabled={busy || tooShort}>
							{busy ? 'Sending…' : 'Send report'}
						</button>
					</div>
				</form>

				<p class="note">Sent anonymously. No account needed, nothing about you is attached.</p>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 72;
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
		width: min(420px, 100%);
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
		padding: 0.65rem 0.9rem;
		font-size: 0.45rem;
		color: var(--gold);
		background: var(--screen-deep);
		border-bottom: 2px solid var(--cabinet-lo);
	}
	.inner {
		padding: 1.2rem 1.2rem 1.3rem;
	}
	h2 {
		font-size: 0.62rem;
		line-height: 1.5;
		color: var(--cream);
	}
	.subject {
		margin: 0.7rem 0 0;
		font-size: 0.95rem;
		color: var(--gold);
	}
	.sub {
		margin: 0.6rem 0 1rem;
		font-size: 0.9rem;
		line-height: 1.45;
		color: var(--cream-dim);
	}
	textarea {
		width: 100%;
		padding: 0.75rem 0.8rem;
		font-family: var(--font-sans);
		font-size: 1rem;
		line-height: 1.45;
		resize: vertical;
		background: var(--screen-deep);
		color: var(--cream);
		border-top: 2px solid var(--cabinet-lo);
		border-left: 2px solid var(--cabinet-lo);
		border-right: 2px solid var(--cabinet-hi);
		border-bottom: 2px solid var(--cabinet-hi);
	}
	textarea::placeholder {
		color: var(--cream-faint);
	}
	textarea:focus {
		outline: 3px solid var(--gold);
	}
	.row {
		display: flex;
		gap: 0.6rem;
		margin-top: 0.9rem;
	}
	.row .pbtn {
		flex: 1 1 0;
	}
	.err {
		margin: 0.7rem 0 0;
		font-size: 0.85rem;
		color: #ff8f94;
	}
	.err a {
		color: #ff8f94;
	}
	.note {
		margin: 1rem 0 0;
		font-size: 0.78rem;
		line-height: 1.45;
		color: var(--cream-faint);
	}
</style>

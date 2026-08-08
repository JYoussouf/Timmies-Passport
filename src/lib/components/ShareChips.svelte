<script lang="ts">
	/**
	 * The row of per-network share chips. Lives in two places - inline on the
	 * passport page and inside the expanded share modal - so the buttons and
	 * their brand colours are defined exactly once, here.
	 */
	import { shareTo, type ShareNetwork } from '$lib/share/shareCard';

	let {
		blob,
		onshared
	}: {
		blob: Blob | null;
		/** Fired when a native share sheet ran to completion. */
		onshared?: () => void;
	} = $props();

	let sharing = $state(false);

	async function go(network: ShareNetwork) {
		if (sharing) return;
		sharing = true;
		try {
			if (await shareTo(network, blob)) onshared?.();
		} finally {
			sharing = false;
		}
	}
</script>

<div class="nets">
	<button
		class="net instagram"
		aria-label="Share to Instagram"
		title="Instagram"
		onclick={() => go('instagram')}
		disabled={sharing}
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
			<rect x="3" y="3" width="18" height="18" rx="5" />
			<circle cx="12" cy="12" r="4.2" />
			<circle cx="17.4" cy="6.6" r="0.4" fill="currentColor" stroke="none" />
		</svg>
	</button>
	<button
		class="net facebook"
		aria-label="Share to Facebook"
		title="Facebook"
		onclick={() => go('facebook')}
	>
		<svg viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M13.4 21v-7.1h2.6l.5-3.1h-3.1V8.9c0-.9.3-1.6 1.7-1.6h1.5V4.5c-.3 0-1.3-.1-2.4-.1-2.4 0-4.1 1.5-4.1 4.1v2.3H7.5v3.1h2.6V21z"
			/>
		</svg>
	</button>
	<button
		class="net snapchat"
		aria-label="Share to Snapchat"
		title="Snapchat"
		onclick={() => go('snapchat')}
	>
		<svg viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M12.2.8c1 0 4.35.28 5.93 3.82.53 1.2.4 3.22.3 4.85v.06c-.02.18-.03.34-.04.5.08.05.21.09.4.09.3-.02.66-.12 1.04-.3.16-.09.34-.1.46-.1.18 0 .36.03.51.09.45.15.73.48.73.84.02.45-.39.84-1.21 1.17-.09.03-.21.07-.34.12-.45.13-1.14.36-1.34.8-.09.23-.06.53.12.87l.02.02c.06.13 1.52 3.47 4.79 4.01.25.05.43.27.42.51 0 .08-.02.15-.05.23-.24.57-1.27.99-3.14 1.27-.06.09-.12.37-.17.57-.03.18-.07.36-.13.55-.08.27-.27.4-.55.4h-.03c-.14 0-.31-.03-.54-.07-.36-.08-.77-.14-1.27-.14-.3 0-.6.02-.91.08-.6.1-1.13.46-1.73.88-.85.6-1.82 1.29-3.29 1.29-.06 0-.12-.01-.18-.01h-.15c-1.47 0-2.43-.68-3.28-1.29-.6-.42-1.1-.78-1.7-.88-.32-.05-.63-.08-.93-.08-.54 0-.96.09-1.27.15-.21.04-.4.07-.54.07-.38 0-.53-.22-.59-.42-.06-.19-.09-.39-.13-.57-.05-.18-.11-.49-.17-.57-1.92-.22-2.95-.64-3.19-1.22-.03-.07-.05-.15-.05-.23-.02-.24.16-.46.42-.51 3.26-.54 4.73-3.88 4.79-4.02l.02-.03c.18-.34.22-.64.12-.87-.2-.43-.88-.66-1.33-.8-.12-.03-.24-.08-.35-.12-1.1-.44-1.26-.93-1.2-1.27.09-.48.68-.8 1.17-.8.15 0 .27.03.38.08.42.19.79.3 1.1.3.24 0 .39-.06.47-.11l-.05-.57c-.1-1.62-.22-3.65.31-4.83C7.4 1.08 10.74.81 11.73.81l.42-.01z"
			/>
		</svg>
	</button>
	<button class="net x" aria-label="Share to X" title="X" onclick={() => go('x')}>
		<svg viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z"
			/>
		</svg>
	</button>
	<button class="net save" aria-label="Save image" title="Save image" onclick={() => go('save')}>
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<path d="M12 3.5v10.5m0 0l-4.2-4.2M12 14l4.2-4.2" />
			<path d="M4 16.5v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
		</svg>
	</button>
</div>

<style>
	/* Each network wears its own colours. */
	.nets {
		display: flex;
		justify-content: center;
		gap: 0.65rem;
	}

	.net {
		width: 42px;
		height: 42px;

		display: grid;
		place-items: center;

		color: #fff;

		border-radius: 50%;

		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.4);

		transition: transform 0.15s ease;
	}

	.net:hover,
	.net:focus-visible,
	.net:active {
		transform: scale(1.1);
	}

	.net:disabled {
		opacity: 0.4;
	}

	.net.instagram {
		background: radial-gradient(
			circle at 30% 110%,
			#fdf497 0%,
			#fd5949 45%,
			#d6249f 60%,
			#285aeb 90%
		);
	}

	.net.facebook {
		background: #1877f2;
	}

	.net.snapchat {
		background: #fffc00;
		/* The ghost is white, outlined so it survives on yellow. */
		color: #fff;
	}
	.net.snapchat svg {
		filter: drop-shadow(0 0 0.6px #16161d) drop-shadow(0 0 0.6px #16161d);
	}

	.net.x {
		background: #000;
		/* Pure black against a dark backdrop needs an edge of its own. */
		box-shadow:
			0 6px 18px rgba(0, 0, 0, 0.4),
			0 0 0 1.5px rgba(247, 239, 227, 0.35);
	}

	.net.save {
		background: var(--gold);
		color: #16161d;
	}

	.net svg {
		width: 24px;
		height: 24px;
	}

	@media (max-width: 480px) {
		.nets {
			gap: 0.45rem;
		}
		.net {
			width: 40px;
			height: 40px;
		}
	}
</style>

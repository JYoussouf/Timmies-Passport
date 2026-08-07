<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { shareModal } from '$lib/stores/shareModal.svelte';
	import { renderStampMosaic, passportStats } from '$lib/share/passportImage';
	import { APP_NAME, SITE_URL } from '$lib/brand';
	import { ui } from '$lib/stores/ui.svelte';

	type Status = 'rendering' | 'ready' | 'error';

	let status = $state<Status>('rendering');
	let imageUrl = $state('');
	let blob: Blob | null = null;
	let sharing = $state(false);

	const stats = $derived(passportStats());

	const shareText = $derived(
		`I've been to ${stats.count.toLocaleString()} out of ${stats.total.toLocaleString()} Timmies around the world. What about you? ${SITE_URL}`
	);

	async function composeShareImage(
		source: Blob,
		s: ReturnType<typeof passportStats>
	): Promise<Blob> {
		const mapDataUrl = await new Promise<string>((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(reader.error);
			reader.readAsDataURL(source);
		});

		const width = 1400;
		const height = 1050;

		const progress = Math.max(
			0.02,
			Math.min(1, s.count / Math.max(1, s.total))
		);

		const svg = `
		<svg xmlns="http://www.w3.org/2000/svg"
			width="${width}"
			height="${height}"
			viewBox="0 0 ${width} ${height}">

			<defs>
				<linearGradient id="bg" x2="1" y2="1">
					<stop stop-color="#2b1b17"/>
					<stop offset="0.55" stop-color="#172333"/>
					<stop offset="1" stop-color="#101722"/>
				</linearGradient>

				<linearGradient id="bar">
					<stop stop-color="#c51f2c"/>
					<stop offset="1" stop-color="#f1b83e"/>
				</linearGradient>

				<filter id="shadow">
					<feDropShadow
						dx="0"
						dy="18"
						stdDeviation="20"
						flood-opacity=".35"/>
				</filter>

				<clipPath id="mapClip">
					<rect x="55" y="180" width="1290" height="510" rx="10"/>
				</clipPath>
			</defs>


			<!-- BACKGROUND -->
			<rect width="100%" height="100%" fill="url(#bg)"/>

			<circle
				cx="1200"
				cy="120"
				r="260"
				fill="#f1b83e"
				opacity=".08"/>

			<circle
				cx="100"
				cy="900"
				r="260"
				fill="#c51f2c"
				opacity=".08"/>


			<!-- HEADER -->
			<g transform="translate(55 55)">

				<!-- cup -->
				<path
					d="M0 15h55v45c0 16-12 28-28 28S0 76 0 60z"
					fill="#c51f2c"/>

				<path
					d="M55 25h15c20 0 25 30 0 38H55"
					fill="none"
					stroke="#f4e7cf"
					stroke-width="7"/>

				<rect
					width="55"
					height="10"
					rx="3"
					fill="#f4e7cf"/>


				<text
					x="85"
					y="38"
					fill="#f1b83e"
					font-family="Arial"
					font-size="42"
					font-weight="900">
					MY TIMMIES PASSPORT
				</text>

				<text
					x="88"
					y="70"
					fill="#f4e7cf"
					opacity=".55"
					font-family="Arial"
					font-size="14"
					font-weight="700"
					letter-spacing="4">
					YOUR COFFEE JOURNEY
				</text>

			</g>


			<!-- MAP -->
			<rect
				x="45"
				y="170"
				width="1310"
				height="530"
				rx="12"
				fill="#e9ddc6"
				filter="url(#shadow)"/>

			<image
				href="${mapDataUrl}"
				x="55"
				y="180"
				width="1290"
				height="510"
				preserveAspectRatio="none"
				clip-path="url(#mapClip)"/>


			<!-- ROUTES -->
			<g
				clip-path="url(#mapClip)"
				fill="none"
				stroke="#c51f2c"
				stroke-width="4"
				stroke-dasharray="12 12"
				opacity=".55">

				<path d="M180 430 C350 300 500 560 720 400"/>
				<path d="M720 400 C950 250 1120 500 1220 340"/>

			</g>


			<!-- STATS -->
			<text
				x="55"
				y="785"
				fill="#f4e7cf"
				font-family="Arial"
				font-size="14"
				font-weight="800"
				letter-spacing="4">
				THE JOURNEY SO FAR
			</text>


			<text
				x="55"
				y="860"
				fill="#f1b83e"
				font-family="Arial"
				font-size="82"
				font-weight="900">
				${s.count.toLocaleString()}
			</text>

			<text
				x="310"
				y="860"
				fill="#f4e7cf"
				opacity=".6"
				font-family="Arial"
				font-size="32"
				font-weight="700">
				/ ${s.total.toLocaleString()}
			</text>


			<!-- SIDE STATS -->
			<rect
				x="970"
				y="755"
				width="375"
				height="110"
				rx="10"
				fill="#101722"
				opacity=".8"/>


			<text
				x="1005"
				y="805"
				fill="#f1b83e"
				font-family="Arial"
				font-size="34"
				font-weight="900">
				${s.countries}
			</text>

			<text
				x="1005"
				y="835"
				fill="#f4e7cf"
				opacity=".5"
				font-family="Arial"
				font-size="12"
				letter-spacing="3">
				COUNTRIES
			</text>


			<text
				x="1170"
				y="805"
				fill="#f1b83e"
				font-family="Arial"
				font-size="34"
				font-weight="900">
				${s.provinces}
			</text>

			<text
				x="1170"
				y="835"
				fill="#f4e7cf"
				opacity=".5"
				font-family="Arial"
				font-size="12"
				letter-spacing="3">
				PROVINCES
			</text>


			<!-- PROGRESS -->
			<rect
				x="55"
				y="925"
				width="1290"
				height="10"
				rx="5"
				fill="#f4e7cf"
				opacity=".15"/>

			<rect
				x="55"
				y="925"
				width="${1290 * progress}"
				height="10"
				rx="5"
				fill="url(#bar)"/>


			<text
				x="55"
				y="970"
				fill="#f4e7cf"
				opacity=".35"
				font-family="Arial"
				font-size="11"
				font-weight="800"
				letter-spacing="3">
				COLLECTING THE WORLD
			</text>


			<text
				x="1345"
				y="970"
				text-anchor="end"
				fill="#f1b83e"
				font-family="Arial"
				font-size="12"
				font-weight="900">
				${(progress * 100).toFixed(1)}%
			</text>


			<!-- FOOTER -->
			<text
				x="55"
				y="1020"
				fill="#f4e7cf"
				opacity=".35"
				font-family="Arial"
				font-size="10">
				mytimmiespassport.com
			</text>

			<text
				x="1345"
				y="1020"
				text-anchor="end"
				fill="#f4e7cf"
				opacity=".25"
				font-family="Arial"
				font-size="9">
				NOT AFFILIATED WITH TIM HORTONS OR RESTAURANT BRANDS INTERNATIONAL
			</text>

		</svg>`;

		const svgBlob = new Blob([svg], {
			type: 'image/svg+xml;charset=utf-8'
		});

		const url = URL.createObjectURL(svgBlob);

		try {
			const img = await new Promise<HTMLImageElement>((resolve, reject) => {
				const image = new Image();
				image.onload = () => resolve(image);
				image.onerror = reject;
				image.src = url;
			});

			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error();

			ctx.drawImage(img, 0, 0);

			return await new Promise((resolve, reject) => {
				canvas.toBlob((b) => {
					if (b) resolve(b);
					else reject(new Error());
				}, 'image/png');
			});
		} finally {
			URL.revokeObjectURL(url);
		}
	}

	$effect(() => {
		if (!shareModal.open) return;
		status = 'rendering';
		imageUrl = '';
		blob = null;
		const s = stats;
		renderStampMosaic()
			.then((mosaic) => {
				if (!shareModal.open) return null;
				if (!mosaic) throw new Error('no mosaic');
				return composeShareImage(mosaic, s);
			})
			.then((result) => {
				if (!shareModal.open || !result) return;
				blob = result;
				imageUrl = URL.createObjectURL(result);
				status = 'ready';
			})
			.catch(() => {
				if (shareModal.open) status = 'error';
			});
		return () => {
			if (imageUrl) URL.revokeObjectURL(imageUrl);
		};
	});

	function close() {
		if (sharing) return;
		shareModal.close();
	}

	async function shareIt() {
		sharing = true;
		const canShare = typeof navigator.share === 'function';
		try {
			if (blob && canShare) {
				const file = new File([blob], 'my-timmies-passport.png', { type: 'image/png' });
				// canShare is only ever consulted alongside share itself - a browser
				// exposing one without the other is not a real combination, but the
				// check should not assume that pairing holds rather than confirm it.
				const canShareFile =
					typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
				if (canShareFile) {
					await navigator.share({ files: [file], title: APP_NAME, text: shareText });
					shareModal.close();
					return;
				}
			}
			if (canShare) {
				await navigator.share({ title: APP_NAME, text: shareText, url: SITE_URL });
				shareModal.close();
				return;
			}
			// No Web Share API at all - almost always desktop. The image and the
			// caption both still need to get out, just by hand instead.
			if (blob) downloadBlob(blob);
			await navigator.clipboard?.writeText(shareText);
			ui.toast({
				emoji: '📋',
				title: blob ? 'Image downloaded' : 'Copied!',
				body: blob
					? 'Caption copied - attach the image you just downloaded.'
					: 'Share text is on your clipboard.'
			});
			shareModal.close();
		} catch (err) {
			// AbortError: the visitor opened the share sheet and backed out of it -
			// not a failure, and not something to explain to them.
			if ((err as Error)?.name !== 'AbortError') {
				ui.toast({ emoji: '⚠️', title: 'Could not share', body: 'Try again in a moment.' });
			}
		} finally {
			sharing = false;
		}
	}

	function downloadBlob(b: Blob) {
		const url = URL.createObjectURL(b);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'my-timmies-passport.png';
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 4000);
	}
</script>

{#if shareModal.open}
	<div class="overlay" transition:fade={{ duration: 160 }}>
		<button class="scrim" aria-label="Close" onclick={close}></button>

		<div class="modal" transition:scale={{ start: 0.96, duration: 200 }}>
			<div class="cap pixel">
				Share
				<button class="x" aria-label="Close" onclick={close}>×</button>
			</div>

			<div class="preview">
				{#if status === 'rendering'}
					<div class="state">
						<span class="spinner"></span>
						<p>Rendering your passport…</p>
					</div>

				{:else if status === 'error'}
					<div class="state">
						<p>Could not render your passport.</p>
						<button class="pbtn" onclick={shareIt}>
							Share text instead
						</button>
					</div>

				{:else}
					<div class="share-art">
						<img
							src={imageUrl}
							alt="My Timmies Passport journey map"
						/>
					</div>
				{/if}
			</div>


			{#if status !== 'rendering'}
				<button
					class="pbtn pbtn-gold go"
					onclick={shareIt}
					disabled={sharing}
					transition:fade={{ duration: 150 }}
				>
					{sharing ? 'Sharing…' : 'Share this passport'}
				</button>
			{/if}
		</div>
	</div>
{/if}


<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 75;
		display: grid;
		place-items: center;
		padding: 1rem;
	}

	.scrim {
		position: absolute;
		inset: 0;
		background: rgba(11, 21, 36, 0.82);
		border: none;
	}


	.modal {
		position: relative;
		width: min(620px, 100%);
		max-height: calc(100dvh - 2rem);
		display: flex;
		flex-direction: column;

		background: var(--cabinet);

		border-top: 3px solid var(--cabinet-hi);
		border-left: 3px solid var(--cabinet-hi);
		border-right: 3px solid var(--cabinet-lo);
		border-bottom: 3px solid var(--cabinet-lo);

		box-shadow: var(--bevel-lg);
	}


	.cap {
		flex: none;

		display: flex;
		align-items: center;
		justify-content: space-between;

		padding: 0.65rem 0.65rem 0.65rem 0.9rem;

		font-size: 0.45rem;
		color: var(--gold);

		background: var(--screen-deep);

		border-bottom: 2px solid var(--cabinet-lo);
	}


	.x {
		width: 28px;
		height: 28px;

		font-size: 1.1rem;
		line-height: 1;

		color: var(--cream-dim);
	}

	.x:hover {
		color: var(--cream);
	}



	.preview {
		position: relative;

		flex: 1;

		min-height: 240px;

		display: flex;

		overflow: auto;

		background:
			radial-gradient(
				circle at top,
				rgba(241,184,62,.12),
				transparent 40%
			),
			#111720;
	}


	.share-art {
		width: 100%;
		padding: 1rem;

		display: flex;
		justify-content: center;
	}


	.share-art img {
		width: min(100%, 560px);

		height: auto;

		display: block;

		border-radius: 4px;

		box-shadow:
			0 30px 70px rgba(0,0,0,.45),
			0 0 0 1px rgba(255,255,255,.08);
	}



	.state {
		margin: auto;

		padding: 2.2rem 1.4rem;

		display: flex;
		flex-direction: column;
		align-items: center;

		gap: .9rem;

		text-align: center;

		color: var(--cream-dim);

		font-size: .9rem;
	}



	.spinner {
		width: 26px;
		height: 26px;

		border: 3px solid rgba(247,239,227,.2);

		border-top-color: var(--gold);

		border-radius: 50%;

		animation: spin .8s linear infinite;
	}


	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}



	.go {
		align-self: flex-end;

		margin: .8rem;

		padding: .85rem 1.3rem;

		font-size: .6rem;
	}



	@media (max-width: 520px) {

		.share-art {
			padding: .5rem;
		}

		.go {
			width: calc(100% - 1.6rem);
		}
	}



	@media (prefers-reduced-motion: reduce) {

		.spinner {
			animation: none;
		}
	}
</style>
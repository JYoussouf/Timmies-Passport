import { renderStampMosaic, passportStats, type PassportImageStats } from './passportImage';
import { cupRuns, CUP_PALETTE, CUP_H } from '$lib/art/cup';
import { APP_NAME, SITE_URL } from '$lib/brand';
import { ui } from '$lib/stores/ui.svelte';

/**
 * The finished share card - the composed image plus the caption that goes
 * with it - rendered once and cached, so the inline preview on the passport
 * page, the expanded modal and every share chip all act on the same artifact.
 */
export interface ShareCard {
	blob: Blob;
	url: string;
	stats: PassportImageStats;
}

export type ShareNetwork = 'instagram' | 'facebook' | 'snapchat' | 'x' | 'save';

export function shareCaption(s: PassportImageStats = passportStats()): string {
	return `I've been to ${s.count.toLocaleString()} out of ${s.total.toLocaleString()} Timmies around the world. What about you? ${SITE_URL}`;
}

function blobToDataUrl(source: Blob): Promise<string> {
	return new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(source);
	});
}

/** The squat marker cup, one rect per pixel run - same art as the map pins. */
const cupArt = cupRuns()
	.map(
		(r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1.02" fill="${CUP_PALETTE[r.ch]}"/>`
	)
	.join('');

async function composeShareImage(source: Blob, s: PassportImageStats): Promise<Blob> {
	const mapDataUrl = await blobToDataUrl(source);

	const width = 1400;
	const height = 1050;

	const pct = Math.min(1, s.count / Math.max(1, s.total));
	// The bar keeps a visible sliver even at one stamp; the text stays honest.
	const progress = Math.max(0.02, pct);

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
		<g transform="translate(55 45)">

			<!-- the official 8-bit cup, drawn from the marker pixel grid -->
			<g
				transform="scale(${(84 / CUP_H).toFixed(4)})"
				shape-rendering="crispEdges">${cupArt}</g>

			<text
				x="98"
				y="60"
				fill="#f1b83e"
				font-family="Arial"
				font-size="42"
				font-weight="900">
				MY TIMMIES PASSPORT
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


		<!-- STATS -->
		<text
			x="55"
			y="800"
			fill="#f4e7cf"
			font-family="Arial"
			font-size="26"
			font-weight="700">
			I've been to
		</text>

		<text
			x="55"
			y="880"
			font-family="Arial">
			<tspan
				fill="#f1b83e"
				font-size="82"
				font-weight="900">${s.count.toLocaleString()}</tspan>
			<tspan
				dx="14"
				fill="#f4e7cf"
				opacity=".6"
				font-size="32"
				font-weight="700">/ ${s.total.toLocaleString()} Tim Hortons</tspan>
		</text>


		<!-- SIDE BARS: countries and provinces, small cousins of the big bar -->
		<g transform="translate(970 762)">
			<text
				x="0"
				y="0"
				fill="#f4e7cf"
				opacity=".5"
				font-family="Arial"
				font-size="16"
				font-weight="700"
				letter-spacing="3">
				COUNTRIES
			</text>
			<text
				x="375"
				y="0"
				text-anchor="end"
				fill="#f1b83e"
				font-family="Arial"
				font-size="20"
				font-weight="900">
				${s.countries} / ${s.countryTotal}
			</text>
			<rect
				x="0"
				y="14"
				width="375"
				height="12"
				rx="6"
				fill="#f4e7cf"
				opacity=".15"/>
			<rect
				x="0"
				y="14"
				width="${375 * Math.max(0.015, Math.min(1, s.countries / Math.max(1, s.countryTotal)))}"
				height="12"
				rx="6"
				fill="url(#bar)"/>
		</g>

		<g transform="translate(970 838)">
			<text
				x="0"
				y="0"
				fill="#f4e7cf"
				opacity=".5"
				font-family="Arial"
				font-size="16"
				font-weight="700"
				letter-spacing="3">
				PROVINCES
			</text>
			<text
				x="375"
				y="0"
				text-anchor="end"
				fill="#f1b83e"
				font-family="Arial"
				font-size="20"
				font-weight="900">
				${s.provinces} / ${s.provinceTotal}
			</text>
			<rect
				x="0"
				y="14"
				width="375"
				height="12"
				rx="6"
				fill="#f4e7cf"
				opacity=".15"/>
			<rect
				x="0"
				y="14"
				width="${375 * Math.max(0.015, Math.min(1, s.provinces / Math.max(1, s.provinceTotal)))}"
				height="12"
				rx="6"
				fill="url(#bar)"/>
		</g>


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
			x="1345"
			y="978"
			text-anchor="end"
			fill="#f1b83e"
			font-family="Arial"
			font-size="30"
			font-weight="900">
			${(pct * 100).toFixed(1)}%
		</text>


		<!-- FOOTER -->
		<text
			x="55"
			y="1022"
			fill="#f4e7cf"
			opacity=".55"
			font-family="Arial"
			font-size="18"
			font-weight="700">
			mytimmiespassport.com
		</text>

		<text
			x="1345"
			y="1022"
			text-anchor="end"
			fill="#f4e7cf"
			opacity=".4"
			font-family="Arial"
			font-size="14">
			NOT AFFILIATED WITH TIM HORTONS OR RESTAURANT BRANDS INTERNATIONAL
		</text>

	</svg>`;

	const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
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

/*
 * One render per set of numbers. The passport page's inline preview and the
 * expanded modal both call this; whichever asks first pays for the WebGL
 * render and the other gets the same promise back.
 */
let cache: { key: string; promise: Promise<ShareCard | null> } | null = null;

export function renderShareCard(): Promise<ShareCard | null> {
	const s = passportStats();
	const key = [s.count, s.total, s.countries, s.countryTotal, s.provinces, s.provinceTotal].join(
		'|'
	);
	if (cache?.key === key) return cache.promise;
	const stale = cache?.promise;
	const promise = (async (): Promise<ShareCard | null> => {
		const mosaic = await renderStampMosaic();
		if (!mosaic) return null;
		const blob = await composeShareImage(mosaic, s);
		// The numbers moved on while this rendered; the old image can go.
		stale?.then((old) => {
			if (old) URL.revokeObjectURL(old.url);
		});
		return { blob, url: URL.createObjectURL(blob), stats: s };
	})().catch(() => null);
	cache = { key, promise };
	return promise;
}

function openPopup(url: string) {
	window.open(url, '_blank', 'noopener,noreferrer,width=680,height=640');
}

function downloadBlob(b: Blob) {
	const url = URL.createObjectURL(b);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'my-timmies-passport.png';
	a.click();
	setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Explicit per-network share targets.
 *
 * On devices whose browser offers the native share sheet with files (phones,
 * mostly), every network goes through that sheet: it is the only web API
 * that can hand the actual PNG to an installed app, and it only lists apps
 * the device really has - which is as close to "check for the app and go
 * there" as the web is permitted to get. X and Facebook get the caption
 * (with the link) alongside the image; the story networks and Save get the
 * image alone, so picking Instagram or Snapchat drafts a story of just the
 * picture, and Save Image on an iPhone goes to Photos instead of Files.
 *
 * Without a file-capable sheet - desktop, effectively - web intents cannot
 * carry an image, so the PNG is downloaded and the intent opens beside it
 * for hand-attaching.
 *
 * Returns true when a native share sheet ran to completion, so a caller
 * hosting the chips in a modal knows the moment its job is done.
 */
export async function shareTo(network: ShareNetwork, blob: Blob | null): Promise<boolean> {
	const caption = shareCaption();
	const file = blob ? new File([blob], 'my-timmies-passport.png', { type: 'image/png' }) : null;
	/*
	 * Touch, not just share support: desktop Chrome and Safari expose
	 * navigator.share too, but a desktop's sheet holds Mail and AirDrop,
	 * not Instagram - there the web intents with a downloaded image are
	 * the better surface. Coarse pointer is the device actually holding
	 * the apps these chips name.
	 */
	const sheetReady =
		!!file &&
		matchMedia('(pointer: coarse)').matches &&
		typeof navigator.share === 'function' &&
		typeof navigator.canShare === 'function' &&
		navigator.canShare({ files: [file] });

	if (sheetReady && file) {
		const data: ShareData =
			network === 'x' || network === 'facebook'
				? { files: [file], text: caption }
				: { files: [file] };
		try {
			await navigator.share(data);
			return true;
		} catch (err) {
			// Backing out of the sheet is not a failure.
			if ((err as Error)?.name !== 'AbortError') {
				ui.toast({ emoji: '⚠️', title: 'Could not share', body: 'Try again in a moment.' });
			}
			return false;
		}
	}

	if (network === 'x') {
		if (blob) downloadBlob(blob);
		openPopup(`https://x.com/intent/post?text=${encodeURIComponent(caption)}`);
		if (blob) {
			ui.toast({
				emoji: '📎',
				title: 'Image downloaded',
				body: 'Attach it to your post - the text is prefilled.'
			});
		}
		return false;
	}
	if (network === 'facebook') {
		if (blob) downloadBlob(blob);
		openPopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE_URL)}`);
		if (blob) {
			ui.toast({
				emoji: '📎',
				title: 'Image downloaded',
				body: 'Attach it to your post.'
			});
		}
		return false;
	}
	if (network === 'save') {
		if (blob) {
			downloadBlob(blob);
			ui.toast({ emoji: '💾', title: 'Image saved', body: 'Your passport is in your downloads.' });
		}
		return false;
	}
	// Instagram / Snapchat: no web composer exists, so the image goes to disk.
	if (blob) downloadBlob(blob);
	ui.toast({
		emoji: network === 'instagram' ? '📸' : '👻',
		title: 'Image saved',
		body: 'Post it as a story from the app.'
	});
	return false;
}

/** Text-first fallback for when the image could not be rendered at all. */
export async function shareTextOnly(): Promise<boolean> {
	const caption = shareCaption();
	try {
		if (typeof navigator.share === 'function') {
			await navigator.share({ title: APP_NAME, text: caption, url: SITE_URL });
			return true;
		}
		await navigator.clipboard?.writeText(caption);
		ui.toast({ emoji: '📋', title: 'Copied!', body: 'Share text is on your clipboard.' });
	} catch (err) {
		if ((err as Error)?.name !== 'AbortError') {
			ui.toast({ emoji: '⚠️', title: 'Could not share', body: 'Try again in a moment.' });
		}
	}
	return false;
}

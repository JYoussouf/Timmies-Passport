/** Small, dependency-free delight helpers: haptics + confetti. */

export function haptic(pattern: number | number[] = 18) {
	if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
		try {
			navigator.vibrate(pattern);
		} catch {
			/* not supported */
		}
	}
}

const prefersReducedMotion = () =>
	typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const CONFETTI_COLORS = ['#d8232a', '#f2b134', '#3fa88b', '#f7efe3', '#4a2e23'];

/** Particles snap to this grid so the burst reads as pixels, not glitter. */
const CELL = 4;
const snap = (n: number) => Math.round(n / CELL) * CELL;

/**
 * Bursts pixel confetti from a point (viewport coords). Pure canvas, no deps.
 * Respects prefers-reduced-motion (renders nothing).
 */
export function confettiBurst(x: number, y: number, count = 80) {
	if (typeof document === 'undefined' || prefersReducedMotion()) return;

	const canvas = document.createElement('canvas');
	canvas.style.cssText =
		'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
	const dpr = Math.min(window.devicePixelRatio || 1, 2);
	canvas.width = innerWidth * dpr;
	canvas.height = innerHeight * dpr;
	document.body.appendChild(canvas);
	const ctx = canvas.getContext('2d')!;
	ctx.scale(dpr, dpr);

	type P = { x: number; y: number; vx: number; vy: number; size: number; color: string };
	const parts: P[] = Array.from({ length: count }, () => {
		const angle = Math.random() * Math.PI * 2;
		const speed = 4 + Math.random() * 9;
		return {
			x,
			y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed - 6,
			// Two sizes only, both multiples of the grid cell.
			size: Math.random() < 0.5 ? CELL : CELL * 2,
			color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0]
		};
	});

	const gravity = 0.32;
	const drag = 0.985;
	let frame = 0;
	const maxFrames = 140;

	function tick() {
		ctx.clearRect(0, 0, innerWidth, innerHeight);
		// Alpha steps in quarters rather than fading smoothly, to match the
		// stepped animation language everywhere else.
		const life = Math.max(0, 1 - frame / maxFrames);
		ctx.globalAlpha = Math.ceil(life * 4) / 4;
		for (const p of parts) {
			p.vx *= drag;
			p.vy = p.vy * drag + gravity;
			p.x += p.vx;
			p.y += p.vy;
			ctx.fillStyle = p.color;
			ctx.fillRect(snap(p.x), snap(p.y), p.size, p.size);
		}
		ctx.globalAlpha = 1;
		frame++;
		if (frame < maxFrames) requestAnimationFrame(tick);
		else canvas.remove();
	}
	requestAnimationFrame(tick);
}

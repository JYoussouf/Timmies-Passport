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

const CONFETTI_COLORS = ['#d8232a', '#e8893b', '#b07a4f', '#f7efe3', '#2f7d6b'];

/**
 * Bursts confetti from a point (viewport coords). Pure canvas, no deps.
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

	type P = {
		x: number;
		y: number;
		vx: number;
		vy: number;
		rot: number;
		vr: number;
		size: number;
		color: string;
		shape: number;
	};
	const parts: P[] = Array.from({ length: count }, () => {
		const angle = Math.random() * Math.PI * 2;
		const speed = 4 + Math.random() * 9;
		return {
			x,
			y,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed - 6,
			rot: Math.random() * Math.PI,
			vr: (Math.random() - 0.5) * 0.4,
			size: 5 + Math.random() * 7,
			color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
			shape: (Math.random() * 2) | 0
		};
	});

	const gravity = 0.32;
	const drag = 0.985;
	let frame = 0;
	const maxFrames = 140;

	function tick() {
		ctx.clearRect(0, 0, innerWidth, innerHeight);
		for (const p of parts) {
			p.vx *= drag;
			p.vy = p.vy * drag + gravity;
			p.x += p.vx;
			p.y += p.vy;
			p.rot += p.vr;
			ctx.save();
			ctx.translate(p.x, p.y);
			ctx.rotate(p.rot);
			ctx.globalAlpha = Math.max(0, 1 - frame / maxFrames);
			ctx.fillStyle = p.color;
			if (p.shape === 0) ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
			else {
				ctx.beginPath();
				ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.restore();
		}
		frame++;
		if (frame < maxFrames) requestAnimationFrame(tick);
		else canvas.remove();
	}
	requestAnimationFrame(tick);
}

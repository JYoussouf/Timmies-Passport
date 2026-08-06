export interface Toast {
	id: number;
	emoji: string;
	title: string;
	body?: string;
	action?: { label: string; run: () => void };
	timeout: number;
}

const NUDGE_KEY = 'timmies.nudge.dismissed.v1';
const NUDGE_AFTER = 3; // check-ins before we suggest signing up

class UI {
	selectedId = $state<string | null>(null);
	authOpen = $state(false);
	authMode = $state<'signup' | 'login'>('login');
	toasts = $state<Toast[]>([]);
	private nextId = 1;
	nudged = $state(false);

	select(id: string | null) {
		this.selectedId = id;
	}

	openAuth(mode: 'signup' | 'login' = 'login') {
		this.authMode = mode;
		this.authOpen = true;
	}

	closeAuth() {
		this.authOpen = false;
	}

	toast(t: Omit<Toast, 'id' | 'timeout'> & { timeout?: number }) {
		const id = this.nextId++;
		const toast: Toast = { timeout: 4200, ...t, id };
		this.toasts = [...this.toasts, toast];
		if (toast.timeout > 0) setTimeout(() => this.dismiss(id), toast.timeout);
		return id;
	}

	dismiss(id: number) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
	}

	/** Show the "sign up to save" nudge once, after a few check-ins. */
	maybeNudge(count: number, isCloud: boolean) {
		if (isCloud || this.nudged || count < NUDGE_AFTER) return;
		if (typeof localStorage !== 'undefined' && localStorage.getItem(NUDGE_KEY)) return;
		this.nudged = true;
		if (typeof localStorage !== 'undefined') localStorage.setItem(NUDGE_KEY, '1');
		this.toast({
			emoji: '📖',
			title: 'Save your passport',
			body: `You've collected ${count} stamps. Sign up to keep them forever.`,
			action: { label: 'Sign up', run: () => this.openAuth('signup') },
			timeout: 9000
		});
	}
}

export const ui = new UI();

import type { SessionUser } from '$lib/types';
import * as api from '$lib/api';
import { passport } from './passport.svelte';
import { ui } from './ui.svelte';

class Auth {
	user = $state<SessionUser | null>(null);
	checked = $state(false);

	get signedIn() {
		return this.user !== null;
	}

	async init() {
		const res = await api.fetchSession();
		this.user = res?.user ?? null;
		if (this.user) {
			if (res?.visits) passport.merge(res.visits);
			passport.markSynced();
		}
		this.checked = true;
	}

	async signup(email: string, password: string, displayName: string) {
		const res = await api.signup(email, password, displayName, passport.visits);
		if (!res) return { ok: false, error: 'Could not create your account. Is email already used?' };
		this.user = res.user;
		passport.markSynced();
		ui.closeAuth();
		ui.toast({ emoji: '📖', title: 'Passport saved!', body: `Welcome, ${res.user.displayName}.` });
		return { ok: true };
	}

	async login(email: string, password: string) {
		const res = await api.login(email, password, passport.visits);
		if (!res) return { ok: false, error: 'Wrong email or password.' };
		this.user = res.user;
		if (res.visits) passport.merge(res.visits);
		passport.markSynced();
		ui.closeAuth();
		ui.toast({ emoji: '☕', title: `Welcome back`, body: res.user.displayName });
		return { ok: true };
	}

	async logout() {
		await api.logout();
		this.user = null;
		passport.cloud = false;
		ui.toast({ emoji: '👋', title: 'Signed out', body: 'Your stamps stay on this device.' });
	}
}

export const auth = new Auth();

import type { Visit, Visits } from '$lib/types';
import { locations } from './locations.svelte';
import { pushVisit } from '$lib/api';

const LS_KEY = 'timmies.passport.v1';
const LS_SYNCED = 'timmies.synced.v1';

function nowIso() {
	return new Date().toISOString();
}

/**
 * The single source of truth for the current user's collected stamps.
 * Works entirely offline against localStorage; when the user signs in we
 * merge this into the cloud and keep writing through to the server.
 */
class Passport {
	visits = $state<Visits>({});
	/** Whether changes are persisted to a cloud account (vs. local only). */
	cloud = $state(false);
	private hydrated = false;

	hydrate() {
		if (this.hydrated || typeof localStorage === 'undefined') return;
		this.hydrated = true;
		try {
			const raw = localStorage.getItem(LS_KEY);
			if (raw) this.visits = JSON.parse(raw);
		} catch {
			/* corrupt store - start fresh */
		}
	}

	private persist() {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(LS_KEY, JSON.stringify(this.visits));
	}

	isVisited(id: string) {
		return id in this.visits;
	}

	get count() {
		return Object.keys(this.visits).length;
	}

	getNote(id: string) {
		return this.visits[id]?.note ?? '';
	}

	/** Toggle a check-in. Returns true if it became checked-in. */
	toggle(id: string): boolean {
		if (this.visits[id]) {
			const { [id]: _, ...rest } = this.visits;
			this.visits = rest;
			this.persist();
			if (this.cloud) void pushVisit(id, false);
			return false;
		}
		this.visits = { ...this.visits, [id]: { visitedAt: nowIso(), note: '' } };
		this.persist();
		if (this.cloud) void pushVisit(id, true);
		return true;
	}

	setNote(id: string, note: string) {
		const existing = this.visits[id] ?? { visitedAt: nowIso(), note: '' };
		this.visits = { ...this.visits, [id]: { ...existing, note } };
		this.persist();
		if (this.cloud) void pushVisit(id, true, note);
	}

	/** Merge a set of visits in (used when importing cloud state). */
	merge(incoming: Visits) {
		const next: Visits = { ...this.visits };
		for (const [id, v] of Object.entries(incoming)) {
			const cur = next[id];
			// keep the earliest visitedAt, prefer a non-empty note
			if (!cur) next[id] = v;
			else
				next[id] = {
					visitedAt: cur.visitedAt < v.visitedAt ? cur.visitedAt : v.visitedAt,
					note: cur.note || v.note
				};
		}
		this.visits = next;
		this.persist();
	}

	reset() {
		this.visits = {};
		this.persist();
	}

	markSynced() {
		this.cloud = true;
		if (typeof localStorage !== 'undefined') localStorage.setItem(LS_SYNCED, '1');
	}

	// --- Derived stats ------------------------------------------------------
	get visitedIds(): string[] {
		return Object.keys(this.visits);
	}

	get countriesVisited(): Map<string, number> {
		const m = new Map<string, number>();
		for (const id of this.visitedIds) {
			const cc = locations.get(id)?.country_code;
			if (cc) m.set(cc, (m.get(cc) ?? 0) + 1);
		}
		return m;
	}


	/** Most recent check-in timestamps, newest first. */
	get timeline(): { id: string; visit: Visit }[] {
		return Object.entries(this.visits)
			.map(([id, visit]) => ({ id, visit }))
			.sort((a, b) => b.visit.visitedAt.localeCompare(a.visit.visitedAt));
	}
}

export const passport = new Passport();

import type { SessionUser, Visits } from '$lib/types';

/**
 * Thin client for the optional cloud backend. Everything here degrades
 * gracefully: if D1 isn't configured the app still works fully local-first.
 */

async function jsonOrNull<T>(p: Promise<Response>): Promise<T | null> {
	try {
		const res = await p;
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

export interface LocationStats {
	checkInCount: number;
}

export function fetchLocationStats(id: string) {
	return jsonOrNull<LocationStats>(fetch(`/api/locations/${encodeURIComponent(id)}`));
}

export interface LeaderboardData {
	topLocations: {
		id: string;
		name: string;
		address: string;
		city: string;
		region: string;
		count: number;
	}[];
	topCountries: { country_code: string; country: string; visited: number; total: number }[];
	topPlayers: { id: string; display_name: string; count: number }[];
	/** The signed-in visitor's own standing, even when it falls outside topPlayers. */
	me: { rank: number; count: number; displayName: string } | null;
	totalCheckIns: number;
	totalCollectors: number;
}

export function fetchLeaderboard() {
	return jsonOrNull<LeaderboardData>(fetch('/api/leaderboard'));
}

export function fetchSession() {
	return jsonOrNull<{ user: SessionUser | null; visits?: Visits }>(fetch('/api/auth/session'));
}

export async function signup(email: string, password: string, displayName: string, visits: Visits) {
	return jsonOrNull<{ user: SessionUser }>(
		fetch('/api/auth/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, displayName, visits })
		})
	);
}

export async function login(email: string, password: string, visits: Visits) {
	return jsonOrNull<{ user: SessionUser; visits: Visits }>(
		fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password, visits })
		})
	);
}

export async function logout() {
	await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
}

export async function pushVisit(locationId: string, checkedIn: boolean, note?: string) {
	return jsonOrNull(
		fetch('/api/visits', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ locationId, checkedIn, note })
		})
	);
}

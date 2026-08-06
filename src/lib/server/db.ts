import type { D1Database } from '@cloudflare/workers-types';
import type { RequestEvent } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

/** Returns the D1 binding or null when the cloud backend isn't configured. */
export function getDb(event: RequestEvent): D1Database | null {
	return event.platform?.env?.DB ?? null;
}

/** Like getDb but throws a clean 503 - use in routes that require the backend. */
export function requireDb(event: RequestEvent): D1Database {
	const db = getDb(event);
	if (!db) throw error(503, 'Cloud backend not configured');
	return db;
}

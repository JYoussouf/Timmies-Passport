/// <reference types="@sveltejs/kit" />

import type { D1Database } from '@cloudflare/workers-types';

declare global {
	namespace App {
		interface Error {}
		interface Locals {
			user: { id: string; email: string; displayName: string } | null;
		}
		interface PageData {}
		interface PageState {}
		interface Platform {
			env?: {
				DB?: D1Database;
				GOOGLE_MAPS_API_KEY?: string;
				/* Secrets, set with `wrangler pages secret put`. Absent locally,
				   which is why the report endpoint checks before using them. */
				GITHUB_TOKEN?: string;
				GITHUB_REPO?: string;
			};
			cf?: CfProperties;
			ctx?: ExecutionContext;
		}
	}
}

export {};

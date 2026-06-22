# ☕ Timmies Passport

Track every Tim Hortons in the world and collect the ones you've visited like
passport stamps. Local-first, delightful, and mobile-first.

- **Map of every Timmies** — 4,300+ locations harvested from OpenStreetMap, clustered on a themed MapLibre map.
- **Collect stamps** — tap a location, check in with a satisfying passport-stamp animation, confetti, and haptics.
- **Works with no account** — everything lives in `localStorage`. A gentle nudge invites you to sign up; signing up syncs your stamps to the cloud and across devices.
- **Private notes** per location, plus a global "how many others checked in here".
- **Badges, stats & a leaderboard** — countries visited, completion %, most-stamped Timmies, and country-completion races.

## Tech

SvelteKit (Svelte 5 runes) · MapLibre GL · Cloudflare Pages/Workers · D1 (SQLite).
The app is a client-rendered SPA; the Cloudflare adapter also serves the API
routes (`src/routes/api/**`) and the optional cloud backend.

## Develop

```bash
npm install

# One-time: create the local D1 database (schema + 4.3k locations)
npm run db:migrate:local
npm run db:seed:local

npm run dev          # http://localhost:5173
```

Local dev uses `platformProxy`, so the D1 binding from `wrangler.toml` is
available to the API routes. Without D1 the app still runs fully local-first —
accounts/leaderboards just stay empty.

## Refresh the location data

```bash
npm run fetch:locations   # re-query OpenStreetMap → static/locations.json + scripts/seed.sql
npm run db:seed:local     # reload into D1
```

`scripts/fetch-locations.ts` pulls `brand=Tim Hortons` worldwide from the
Overpass API and reverse-geocodes each point's country/region from Natural
Earth boundaries (OSM rarely tags those). OSM data is ODbL-licensed.

## Deploy to Cloudflare

```bash
npx wrangler login
npx wrangler d1 create timmies-passport-db   # paste database_id into wrangler.toml
npm run db:migrate        # apply schema to the remote DB
npm run db:seed           # seed remote locations
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare
```

Optionally add a Google key for live ratings/photos:
`npx wrangler pages secret put GOOGLE_MAPS_API_KEY`.

## Project map

| Path | What |
| --- | --- |
| `scripts/fetch-locations.ts` | Overpass harvester + reverse-geocoder |
| `src/lib/stores/*.svelte.ts` | local-first passport, locations index, auth, UI |
| `src/lib/components/` | MapView, LocationSheet (stamp animation), TopBar, BadgeGrid, … |
| `src/routes/api/**` | locations, visits, auth, leaderboard endpoints |
| `migrations/0001_init.sql` | D1 schema |

## Design notes

- **Global counts** only increment for *authenticated* check-ins, keeping "N
  others here" meaningful and abuse-resistant. Anonymous check-ins stay local
  until you sign up and sync.
- Animations respect `prefers-reduced-motion`.

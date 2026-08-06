# Arcade Tracker Redesign

Date: 2026-08-05
Status: Approved

## Goal

Rethemed Timmies Passport as a retro pixel-arcade "tracker" console, in the spirit of spideytracker.net but built from Tim Hortons and Canadian visual language.
The whole app is retheme, the map is permanently dark, and the result must feel native on a mobile web browser rather than like a desktop layout that was shrunk.

This is a purely presentational change.
Stores, API routes, the D1 layer, and the data scripts are untouched.

## Non-goals

- No light mode.
  The arcade look depends on a dark screen, and maintaining two palettes doubles the surface area for no benefit.
- No new gameplay, badges, or data.
  Existing badges, stats, and leaderboard semantics stay exactly as they are.
- No change to the local-first or cloud-sync behaviour.
- No installable-PWA or native-app work.
  "Native to mobile" here means the web experience respects safe areas, touch targets, and viewport quirks.

## Visual system

### Palette

The brand DNA is preserved but inverted into a dark cabinet.

| Token | Value | Role |
| --- | --- | --- |
| `--void` | `#150d0a` | Page background behind the cabinet |
| `--cabinet` | `#2b1a14` | Console frame body |
| `--cabinet-hi` | `#4a2e23` | Hard bevel highlight |
| `--cabinet-lo` | `#0f0806` | Hard bevel shadow |
| `--screen` | `#101d2e` | Map "ocean" |
| `--screen-deep` | `#0b1524` | Map ocean at depth, panel backgrounds |
| `--land` | `#e8dcc8` | Landmass fill |
| `--tim-red` | `#d8232a` | Unstamped markers, primary actions |
| `--tim-red-deep` | `#b21a20` | Pressed state for primary actions |
| `--gold` | `#f2b134` | HUD panel, marquee, streaks, focus rings |
| `--mint` | `#3fa88b` | Stamped and collected markers |
| `--cream` | `#f7efe3` | Pixel text |
| `--cream-dim` | `rgba(247, 239, 227, 0.55)` | Secondary text |

Contrast targets: all text meets WCAG AA against its own background.
Cream on cabinet and cream on screen-deep both clear 4.5:1.
Gold is used for text only on dark backgrounds, never as light-on-gold.

### Typography

Two families, split by function.

`Press Start 2P` is used for chrome only: HUD counters, headings, nav labels, buttons, badge titles, leaderboard ranks.
It is self-hosted as woff2 under `static/fonts/`, declared with `font-display: swap`, and subset to Latin.
No CDN request, so the app keeps working offline and there is no third-party dependency.

Inter (already in the project) is used for all body copy: location addresses, notes, descriptions, help text, and anything longer than roughly twelve words.
Pixel type is unreadable at paragraph length, and confining it to chrome is what makes the reference design work rather than fail.

If a specific pixel-font label proves illegible during verification, that label moves to Inter.
Legibility wins over aesthetic consistency.

### Shape and depth

Border radius is zero everywhere.
Depth comes from stepped, unblurred box-shadows rather than soft shadows.

- `--bevel-sm`: `2px 2px 0 var(--cabinet-lo)`
- `--bevel-md`: `3px 3px 0 var(--cabinet-lo)`
- `--bevel-lg`: `5px 5px 0 var(--cabinet-lo)`

Interactive elements press by translating down and right by the shadow offset and removing the shadow, producing a physical button feel with no layout shift.

### Texture

A repeating 1px horizontal scanline overlay at 4% opacity sits above the map and below the UI chrome, plus a subtle radial vignette.
Both are `pointer-events: none`.
Both are removed under `prefers-reduced-motion: reduce` and under `prefers-contrast: more`.

## Map

### Basemap

The remote CARTO Positron style URL is replaced by a local `StyleSpecification` object in `src/lib/map/style.ts`.
It sources the same free CARTO vector tiles (OpenMapTiles schema, OpenStreetMap data) but defines its own layers:

- Background painted `--screen`.
- Landmass flat `--land` with no shading.
- Country boundaries as 1px dotted `--cream-dim`.
- Country and major-region labels only, at low opacity, hidden below zoom 3.
- Roads, buildings, and POIs suppressed below zoom 8, and kept minimal above it so the tracker stays flat and readable.

This removes the generic web-map appearance and produces the flat, high-contrast tracker look.

### Markers

Markers are sprite images rather than MapLibre circles.
`src/lib/map/sprites.ts` generates each sprite as an SVG serialized to a data URI, rasterizes it to an `ImageData` at `pixelRatio: 2`, and registers it via `map.addImage()`.
This keeps the marker art in-repo, dependency-free, and crisp on retina displays.

- **Unstamped**: hollow red donut ring with a crisp 2px edge.
- **Stamped**: filled mint donut with a cream sprinkle notch and a soft outer glow.
- **Cluster**: chunky beveled square in `--cabinet` with a `--gold` border, count rendered in the pixel font.
  Squares distinguish clusters from individual donuts at a glance.
- **Selected**: a blinking gold reticle drawn as a 4-frame animation over the selected marker.
  The animation is static (frame 1 only) under `prefers-reduced-motion`.

Cluster and pin click behaviour, the geolocate control, and the fly-to offsets keep their current logic.

## Layout

The cabinet is the organizing metaphor on large screens, and it dissolves rather than shrinks on small ones.
Chrome that costs vertical space is removed on mobile, not miniaturized.

### Desktop, 900px and above

- Outer cabinet frame with a beveled border around the whole viewport.
- Title plate centered along the top edge reading `TIMMIES PASSPORT` with a coffee-cup glyph either side.
- Left rail of legend chips: stamped, unstamped, current streak.
- Right rail with a mini radar panel showing the current viewport position on a world outline.
- HUD counter floating over the map, top-center, showing remaining unstamped locations in a gold plate.
- Marquee ticker along the bottom edge, scrolling recent check-ins and a share prompt.

### Mobile, below 900px

- Cabinet border collapses to a 3px bevel at the viewport edges only.
- Title plate becomes a compact top bar with the pixel logo and the progress counter.
- Left and right rails collapse into one horizontally scrollable chip strip beneath the top bar.
- Marquee ticker sits directly above the bottom nav at 28px tall.
- Bottom nav becomes a full-width beveled tab bar pinned above `env(safe-area-inset-bottom)`, three tabs, minimum 48px hit targets.
- The map fills the remaining box using `100dvh` rather than `100vh`, so iOS Safari's collapsing toolbar cannot clip the nav.

### Touch behaviour

- `touch-action` is set so the map owns horizontal and vertical panning while the location sheet owns its own vertical drag.
- The location sheet is drag-to-dismiss with a rubber-band past its top stop.
- All interactive controls are at least 44px in their smallest dimension.
- No affordance depends on hover.
  Every hover state has an equivalent focus and active state.

## Screens

### Location sheet

Becomes a "cartridge" panel that slides up from the bottom with a beveled top edge.
The header shows the store name in pixel type and the address in Inter.
The primary action is a gold `[ STAMP IT ]` button.
Pressing it runs the existing check-in logic and restyles the current stamp animation as a six-frame pixel thunk, with confetti rendered as square pixels rather than round particles.
Haptics stay as they are.

### Passport

The stamp collection becomes an inventory screen.
Slots are laid out in a beveled grid.
Empty slots show a dim donut silhouette, filled slots show the mint donut sprite with the store name beneath.
Badges become achievement plaques: beveled tiles, earned ones in gold, unearned ones dimmed with their progress bar rendered as a segmented pixel meter.

### Leaderboard

Becomes an arcade high-score table.
Columns are rank, name in pixel type, and score.
The top three rows get gold, silver, and bronze plates.
The current user's row is highlighted and pinned to the top of the viewport when scrolled out of view.

### Shared chrome

`AuthModal`, `Toaster`, and `SearchOverlay` are restyled to the same beveled, zero-radius, pixel-headed language.
Toasts appear as small cabinet plates.
The search overlay becomes a full-screen terminal-style list with a pixel input caret.

## Files

New:

- `src/lib/styles/arcade.css` — tokens and primitives (bevel, plate, pixel-button, chip, scanline).
- `src/lib/map/sprites.ts` — sprite generation and registration.
- `src/lib/components/Cabinet.svelte` — the responsive frame wrapper.
- `src/lib/components/Hud.svelte` — the unstamped-count plate.
- `src/lib/components/Marquee.svelte` — the scrolling ticker.
- `static/fonts/` — self-hosted pixel font woff2 and its license.

Rewritten:

- `src/app.css`
- `src/lib/map/style.ts`
- `src/lib/components/MapView.svelte`
- `src/lib/components/TopBar.svelte`
- `src/lib/components/BottomNav.svelte`
- `src/lib/components/LocationSheet.svelte`
- `src/lib/components/BadgeGrid.svelte`
- `src/lib/components/SearchOverlay.svelte`
- `src/lib/components/AuthModal.svelte`
- `src/lib/components/Toaster.svelte`
- `src/lib/components/PageHeader.svelte`
- `src/routes/+layout.svelte`
- `src/routes/+page.svelte`
- `src/routes/passport/+page.svelte`
- `src/routes/leaderboard/+page.svelte`

Untouched:

- Everything under `src/lib/stores/`, `src/lib/server/`, `src/routes/api/`, `migrations/`, and `scripts/`.
- `src/lib/api.ts`, `src/lib/types.ts`, `src/lib/effects.ts` keep their public surface.
  `effects.ts` may gain a pixel-confetti variant but its existing exports do not change signature.

## Verification

`npm run check` passes with no new errors.

The app is driven in a real browser at three viewports, and each is inspected against this list:

- 390x844 (iPhone 14): map renders dark with cream land, markers are crisp and not blurry, the location sheet drags open and dismisses, the bottom nav clears the home indicator, the chip strip scrolls horizontally, and the page has no horizontal scroll.
- 820x1180 (iPad): layout picks the correct breakpoint and neither crowds nor strands content.
- 1440x900 (desktop): the full cabinet renders with both rails, the HUD, and the marquee, and the map is not clipped by the frame.

On each viewport, all three tabs are visited and a check-in is performed end to end so the stamp animation and the resulting marker state change are both observed.

## Risks

Pixel type at small sizes on a dense map can hurt legibility for location names and notes.
Mitigation is the Inter fallback for all body copy, and moving any specific label to Inter if it still reads badly during verification.

Self-hosting the pixel font adds roughly 10KB to the initial payload.
This is acceptable and is preferable to a third-party CDN request.

Replacing the hosted basemap style with a local specification means we now own the map's layer definitions.
If CARTO changes its tile schema the map could degrade.
The tiles use the stable OpenMapTiles schema, so this risk is low, and the failure mode is visual rather than functional.

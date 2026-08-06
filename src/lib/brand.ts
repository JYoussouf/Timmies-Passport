/**
 * Every user-facing name in one place.
 *
 * The app is named after someone else's trademark, which is a deliberate,
 * eyes-open choice for a fan project - but it means a rename is a live
 * possibility rather than a hypothetical. Keeping the strings here makes that
 * a one-file edit instead of an archaeology exercise across a dozen
 * components, so it can be done in the ten minutes it would need to be.
 *
 * Not covered here, on purpose: the Cloudflare Pages project, the D1 database
 * and the repository. Those are infrastructure, nobody sees them, and renaming
 * them breaks deploys for no benefit.
 *
 * One other file needs editing on a rename: src/app.html, which holds the
 * fallback <title> and the meta description and cannot import from here.
 */

/** The product name, as it appears in titles and share text. */
export const APP_NAME = 'Timmies Passport';

/** Used where the app addresses the collection as the visitor's own. */
export const APP_NAME_OWNED = `My ${APP_NAME}`;

/**
 * What the app does. Descriptive use of the brand is nominative fair use -
 * saying an app tracks Tim Hortons is different from naming it after them.
 */
export const TAGLINE = 'collect every Tim Hortons';

export const REPO_URL = 'https://github.com/JYoussouf/Timmies-Passport';

/** Shown in the map's attribution bar and, at length, on the About page. */
export const DISCLAIMER =
	'Not affiliated with Tim Hortons or Restaurant Brands International';

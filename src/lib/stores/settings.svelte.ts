const LS_KEY = 'timmies.settings.v1';

type Stored = { showClosed?: boolean; locationTried?: boolean };

/**
 * Small, local preferences. Persisted next to the passport rather than synced,
 * because they describe this device's view of the map, not the collection.
 */
class Settings {
	/**
	 * Closed stores are off by default: most people are looking for coffee, and
	 * a shuttered store is noise until you are curious about one. A closure you
	 * have already stamped always shows, regardless - it is part of a passport.
	 */
	showClosed = $state(false);

	/**
	 * Whether the locate button has ever been pressed. Drives the pulse that
	 * points at it on a fresh passport - a hint that stops the moment it has
	 * done its job, not one that argues with a visitor who chose not to share
	 * their location. Set on the click itself, not on the permission result:
	 * a "no" is still someone who found the button.
	 */
	locationTried = $state(false);

	private hydrated = false;

	hydrate() {
		if (this.hydrated || typeof localStorage === 'undefined') return;
		this.hydrated = true;
		try {
			const raw = localStorage.getItem(LS_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Stored;
				this.showClosed = !!parsed.showClosed;
				this.locationTried = !!parsed.locationTried;
			}
		} catch {
			/* corrupt store - keep the defaults */
		}
	}

	private persist() {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(
			LS_KEY,
			JSON.stringify({ showClosed: this.showClosed, locationTried: this.locationTried })
		);
	}

	toggleClosed() {
		this.showClosed = !this.showClosed;
		this.persist();
	}

	markLocationTried() {
		if (this.locationTried) return;
		this.locationTried = true;
		this.persist();
	}
}

export const settings = new Settings();

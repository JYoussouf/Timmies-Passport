const LS_KEY = 'timmies.settings.v1';

type Stored = { showClosed?: boolean };

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

	private hydrated = false;

	hydrate() {
		if (this.hydrated || typeof localStorage === 'undefined') return;
		this.hydrated = true;
		try {
			const raw = localStorage.getItem(LS_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Stored;
				this.showClosed = !!parsed.showClosed;
			}
		} catch {
			/* corrupt store - keep the defaults */
		}
	}

	private persist() {
		if (typeof localStorage === 'undefined') return;
		localStorage.setItem(LS_KEY, JSON.stringify({ showClosed: this.showClosed }));
	}

	toggleClosed() {
		this.showClosed = !this.showClosed;
		this.persist();
	}
}

export const settings = new Settings();

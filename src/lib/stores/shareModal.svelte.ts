/**
 * Open state for the passport share preview, the same shape as report.svelte.ts:
 * mounted once at the layout, opened from wherever a "Share my passport"
 * button lives, so the preview and the map page it is triggered from stay
 * decoupled.
 */
class ShareModal {
	open = $state(false);

	start() {
		this.open = true;
	}

	close() {
		this.open = false;
	}
}

export const shareModal = new ShareModal();

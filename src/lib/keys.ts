/**
 * Keyboard helpers shared by the two places that claim the arrow keys.
 *
 * The map pans with them when nothing is selected; the store stepper walks
 * between stores when something is. Both have to agree on when a keystroke is
 * none of their business, so that test lives here rather than in each of them.
 */

/** A keystroke aimed at a text field belongs to the field, whatever it is. */
export function isTyping(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
	);
}

/** A shortcut with a modifier is a browser or OS command, not ours. */
export function isPlainKey(e: KeyboardEvent): boolean {
	return !e.metaKey && !e.ctrlKey && !e.altKey;
}

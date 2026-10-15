import { matchesBinding, SHORTCUT_COMMAND_PALETTE, SHORTCUT_SETTINGS } from "@/constants/keys";

/**
 * The window-level chords the registry declares but the tab strip does not own:
 * `/⌘K` (the palette) and ⌘, (settings). The strip's ⌘T/⌘W/⌘1…⌘9 stay in
 * `tabKeys.ts` — they need the tab count — while this file takes no state.
 *
 * ⌘K is handled **even while a modal is open**, so it toggles its own palette
 * instead of being swallowed by the palette's `role="dialog"`; ⌘, is suppressed
 * behind an overlay, matching the strip (a navigation must not happen under one).
 */

export type KeymapActions = {
	readonly onCommandPalette: () => void;
	readonly onSettings: () => void;
};

/** Any open overlay dialog: settings must not navigate out from under one. */
const MODAL_SELECTOR = '[role="dialog"]';

/** Handle one keydown; returns `true` when it consumed the event. */
export function handleAppKey(
	event: KeyboardEvent,
	actions: KeymapActions,
	modalOpen = false,
): boolean {
	if (event.defaultPrevented) return false;
	if (matchesBinding(event, SHORTCUT_COMMAND_PALETTE)) {
		event.preventDefault();
		actions.onCommandPalette();
		return true;
	}
	if (modalOpen) return false;
	if (matchesBinding(event, SHORTCUT_SETTINGS)) {
		event.preventDefault();
		actions.onSettings();
		return true;
	}
	return false;
}

/** Listen for the map's window chords; returns the uninstaller. */
export function installAppKeys(actions: KeymapActions): () => void {
	const onKeyDown = (event: KeyboardEvent) => {
		handleAppKey(event, actions, document.querySelector(MODAL_SELECTOR) !== null);
	};
	window.addEventListener("keydown", onKeyDown);
	return () => {
		window.removeEventListener("keydown", onKeyDown);
	};
}

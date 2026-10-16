import { matchesBinding } from "@/constants/chords";
import {
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_SETTINGS,
	SHORTCUT_TOGGLE_SIDEBAR,
} from "@/constants/keys";
import { overlayOpen } from "@/constants/overlay";

/**
 * The window-level chords the registry declares but the tab strip does not own:
 * `⌘K` (the palette), ⌘, (settings) and ⌘B (the sidebar). The strip's
 * ⌘T/⌘W/⌘1…⌘9 stay in `tabKeys.ts` — they need the tab count — while this file
 * takes no state.
 *
 * ⌘K is handled **even while a modal is open**, so it toggles its own palette
 * instead of being swallowed by the palette's `role="dialog"`; ⌘, and ⌘B are
 * suppressed behind an overlay, matching the strip and the transcript's band
 * chords (nothing must happen under one). The one definition of that gate is
 * `constants/overlay.ts`.
 */

export type KeymapActions = {
	readonly onCommandPalette: () => void;
	readonly onSettings: () => void;
	readonly onToggleSidebar: () => void;
};

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
	if (matchesBinding(event, SHORTCUT_TOGGLE_SIDEBAR)) {
		event.preventDefault();
		actions.onToggleSidebar();
		return true;
	}
	return false;
}

/** Listen for the map's window chords; returns the uninstaller. */
export function installAppKeys(actions: KeymapActions): () => void {
	const onKeyDown = (event: KeyboardEvent) => {
		handleAppKey(event, actions, overlayOpen());
	};
	window.addEventListener("keydown", onKeyDown);
	return () => {
		window.removeEventListener("keydown", onKeyDown);
	};
}

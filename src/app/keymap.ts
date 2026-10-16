import { parseChordLabel } from "@/constants/chordParse";
import { matchesBinding } from "@/constants/chords";
import {
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_SETTINGS,
	SHORTCUT_TOGGLE_SIDEBAR,
} from "@/constants/keys";
import { listCommands, runCommand } from "@/plugins/commands";

/**
 * The window-level chords the registry declares but the tab strip does not own:
 * `⌘K` (the palette), ⌘, (settings) and ⌘B (the sidebar). The strip's
 * ⌘T/⌘W/⌘1…⌘9 stay in `tabKeys.ts` — they need the tab count — while this file
 * takes no state.
 *
 * ⌘K is handled **even while a modal is open**, so it toggles its own palette
 * instead of being swallowed by the palette's `role="dialog"`; ⌘, and ⌘B are
 * suppressed behind an overlay, matching the strip (nothing must happen under one).
 *
 * A **plugin command's** chord (M4.19) is matched here too, from the registry read
 * at press time, so a plugin loaded after this listener mounted is bound without a
 * reinstall and one disposed stops firing. It is suppressed behind an overlay like
 * ⌘, and ⌘B — and it can never be an app chord, because a colliding one is refused
 * at registration.
 */

export type KeymapActions = {
	readonly onCommandPalette: () => void;
	readonly onSettings: () => void;
	readonly onToggleSidebar: () => void;
};

/** Any open overlay dialog: settings must not navigate out from under one. */
const MODAL_SELECTOR = '[role="dialog"]';

/**
 * The id of the plugin command whose chord the event names, or `null`. Read from
 * the registry **at press time**, never a list captured when the listener mounted.
 * A refused (colliding or unparseable) chord was never stored, so a match here is
 * unambiguous.
 */
function matchPluginCommand(event: KeyboardEvent): string | null {
	for (const command of listCommands()) {
		if (command.keybinding === undefined) continue;
		const chord = parseChordLabel(command.keybinding);
		if (chord !== null && matchesBinding(event, chord)) return command.id;
	}
	return null;
}

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
	const pluginId = matchPluginCommand(event);
	if (pluginId !== null) {
		event.preventDefault();
		runCommand(pluginId);
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

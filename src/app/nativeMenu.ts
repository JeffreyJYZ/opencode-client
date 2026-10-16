import { isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { toggleSidebar } from "@/app/settings/sidebarActions";
import { closeActiveTabAndGo, requestCommandPalette, requestNewSession } from "@/app/tabSync";
import { MENU_ACTION, MENU_EVENT } from "@/constants/menu";

/**
 * The page's half of the app menu (M5.3). Each item is answered with the same
 * action the chord calls, so the menu is a second path to a command and never the
 * only one (spec 010 §Window).
 *
 * Reload is deliberately **not** here: the shell performs it, because a reload
 * that depends on the page's script still running is useless in the one case it
 * is reached for.
 */

/** What the page runs for each item id it owns. */
const RUNNERS: Record<string, () => void> = {
	[MENU_ACTION.newSession]: requestNewSession,
	[MENU_ACTION.closeTab]: closeActiveTabAndGo,
	[MENU_ACTION.toggleSidebar]: toggleSidebar,
	[MENU_ACTION.commandPalette]: requestCommandPalette,
};

/** Run the action an item id names; `false` when the page owns no such action. */
export function dispatchMenuAction(id: string): boolean {
	const run = RUNNERS[id];
	if (run === undefined) return false;
	run();
	return true;
}

/**
 * Subscribe to the shell's menu events; returns the uninstaller. A browser build
 * has no shell and therefore no menu, so this is a no-op that still returns one.
 */
export async function installNativeMenu(): Promise<() => void> {
	if (!isTauri()) return () => {};
	return listen<string>(MENU_EVENT, (event) => {
		dispatchMenuAction(event.payload);
	});
}

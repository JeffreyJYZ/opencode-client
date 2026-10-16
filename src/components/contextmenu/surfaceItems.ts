import type { OpenCodeClient } from "@opencode/client";
import { toggleSidebar } from "@/app/settings/sidebarActions";
import type { Tab } from "@/app/tabModel";
import {
	closeOtherTabsAndGo,
	closeTabAndGo,
	openSessionAndGo,
	openSettingsAndGo,
	requestCommandPalette,
} from "@/app/tabSync";
import { boundItem, type MenuItem } from "@/components/contextmenu/menuItems";
import {
	SHORTCUT_CLOSE_OTHERS,
	SHORTCUT_CLOSE_TAB,
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_INTERRUPT,
	SHORTCUT_SETTINGS,
	SHORTCUT_TOGGLE_SIDEBAR,
} from "@/constants/keys";
import {
	MENU_ELEMENT_ROUTE_HINT,
	MENU_INTERRUPT_IDLE_HINT,
	MENU_OPEN_SESSION_ID,
	MENU_OPEN_SESSION_LABEL,
} from "@/constants/menu";
import { interruptSession } from "@/session/actions";

/**
 * The four surfaces' item lists (M5.1 requirement 1). Each builder returns rows of
 * the **registry's** actions, so a surface never invents an action and no item
 * assembles a payload — `src/session/actions.ts` stays the one typed seam.
 *
 * The app-wide tail is one function: palette and settings act anywhere, so every
 * surface ends with them and each menu has a chord-bearing item even when the
 * surface's own action is unavailable.
 */

/** The two chords that act on the app from anywhere: every menu ends with them. */
export function appMenuItems(): readonly MenuItem[] {
	return [
		boundItem(SHORTCUT_COMMAND_PALETTE, requestCommandPalette),
		boundItem(SHORTCUT_SETTINGS, openSettingsAndGo),
	];
}

/** A tab: close this one, or close every other — the tab menu (spec 010 §Desktop). */
export function tabMenuItems(tab: Tab): readonly MenuItem[] {
	return [
		boundItem(SHORTCUT_CLOSE_TAB, () => closeTabAndGo(tab)),
		boundItem(SHORTCUT_CLOSE_OTHERS, () => closeOtherTabsAndGo(tab)),
		...appMenuItems(),
	];
}

/**
 * A recents row: open it. It is the one item with **no chord** — "open *this*
 * row" has no global key — so its keyboard route is the row itself: the row is a
 * button, and `Enter` on it does exactly what the item does.
 */
export function recentsMenuItems(id: string): readonly MenuItem[] {
	return [
		{
			id: MENU_OPEN_SESSION_ID,
			label: MENU_OPEN_SESSION_LABEL,
			accelerator: MENU_ELEMENT_ROUTE_HINT,
			run: () => openSessionAndGo(id),
		},
		...appMenuItems(),
	];
}

/**
 * A transcript row — and the region's own `⇧F10`. The session's turn comes first:
 * interrupting a running turn is what a transcript's own menu is *for*, and the
 * item is the same `interruptSession` call `Esc` and the composer make. Idle, the
 * item keeps its place and its chord and says why it cannot act, rather than
 * disappearing or calling the server for nothing.
 */
export function transcriptMenuItems(input: {
	readonly client: OpenCodeClient | null;
	readonly sessionID: string;
	readonly running: boolean;
}): readonly MenuItem[] {
	const { client, sessionID, running } = input;
	return [
		boundItem(
			SHORTCUT_INTERRUPT,
			() => {
				if (client !== null) void interruptSession(client, sessionID);
			},
			{ disabled: !running, disabledHint: MENU_INTERRUPT_IDLE_HINT },
		),
		...appMenuItems(),
	];
}

/** A sidebar panel: collapse the panel's region (the panel's own action), then the app's. */
export function panelMenuItems(): readonly MenuItem[] {
	return [boundItem(SHORTCUT_TOGGLE_SIDEBAR, toggleSidebar), ...appMenuItems()];
}

/**
 * The app menu's seam (spec 010 §Window, M5.3). The shell draws the menu and
 * raises one window event per activation; this file is the page's half of that
 * pair, and `src-tauri/src/menu.rs` is the other.
 *
 * The ids are written in both languages — two spellings of one string — so the
 * pair *is* the contract. A Rust test asserts each id round-trips to the action
 * that produced it, and `nativeMenu.test.ts` asserts every id the page owns is
 * answered: an item in one half and not the other is an item that does nothing.
 */

/** The event the shell raises when a menu item is activated. */
export const MENU_EVENT = "oc:menu";

/** The item ids, exactly as `Action::id()` spells them in `menu.rs`. */
export const MENU_ACTION = {
	newSession: "file.new-session",
	closeTab: "file.close-tab",
	toggleSidebar: "view.toggle-sidebar",
	commandPalette: "view.command-palette",
	reload: "view.reload",
} as const;

export type MenuAction = (typeof MENU_ACTION)[keyof typeof MENU_ACTION];

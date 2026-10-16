import {
	chordLabel,
	commandAltChordLabel,
	KEY_ACTION,
	KEY_MODIFIER,
	type KeyBinding,
	tabRangeLabel,
} from "@/constants/chords";
import {
	SHORTCUT_BAND_NEXT,
	SHORTCUT_BAND_PREVIOUS,
	SHORTCUT_CONTEXT_MENU,
	SHORTCUT_INTERRUPT,
	SHORTCUT_SEND,
} from "./surfaceKeys";

export {
	KEY_ACTION,
	SHORTCUT_BAND_NEXT,
	SHORTCUT_BAND_PREVIOUS,
	SHORTCUT_CONTEXT_MENU,
	SHORTCUT_INTERRUPT,
	SHORTCUT_SEND,
};

/**
 * The keyboard map (spec 010 §Desktop behaviours): **one table**, so the palette's
 * help and every handler read the same declaration and no chord is claimed twice.
 * The chord algebra — labelling, identity, matching — is next door in `chords.ts`;
 * the rows a **surface** matches (the composer's ⌘↩ and `Esc`, a region's ⇧F10, the
 * transcript's ⌥↑/⌥↓) are in `surfaceKeys.ts`, re-exported here so
 * `@/constants/keys` stays the one import site. Consumers: `src/app/tabKeys.ts`
 * (the strip), `src/app/keymap.ts` (⌘K, ⌘,, ⌘B), the composer, and the transcript's
 * `bandNav.ts`. Labels are composed, never typed as glyphs.
 */

/**
 * `Escape` has **no chord row** in the map: it is not a window shortcut but the
 * key a surface, popover or dialog recognises as its own dismissal. It is named
 * here all the same, so the two places that match it hold no literal.
 */
export const KEY_ESCAPE = "Escape";

/** ⌘K: open the command palette (spec 010 §Desktop behaviours). */
export const SHORTCUT_COMMAND_PALETTE: KeyBinding = {
	id: KEY_ACTION.commandPalette,
	key: "k",
	modifier: KEY_MODIFIER.command,
	label: chordLabel("K"),
	description: "Command palette",
};

/** ⌘T: the affordance M1.3 fills with session creation. */
export const SHORTCUT_NEW_SESSION: KeyBinding = {
	id: KEY_ACTION.newSession,
	key: "t",
	modifier: KEY_MODIFIER.command,
	label: chordLabel("T"),
	description: "New session",
};

/** ⌘W: close the active tab. The session itself keeps running. */
export const SHORTCUT_CLOSE_TAB: KeyBinding = {
	id: KEY_ACTION.closeTab,
	key: "w",
	modifier: KEY_MODIFIER.command,
	label: chordLabel("W"),
	description: "Close tab",
};

/** ⌘1…⌘9: switch by strip index. One row with a range, not nine rows. */
export const SHORTCUT_SWITCH_TAB: KeyBinding = {
	id: KEY_ACTION.switchTab,
	key: "1–9",
	modifier: KEY_MODIFIER.command,
	label: tabRangeLabel(),
	description: "Switch tab",
};

/** ⌘,: open the settings view as a tab (spec 010 §Routes, one of four entries). */
export const SHORTCUT_SETTINGS: KeyBinding = {
	id: KEY_ACTION.settings,
	key: ",",
	modifier: KEY_MODIFIER.command,
	label: chordLabel(","),
	description: "Settings",
};

/**
 * ⌘B: toggle the sidebar (spec 020 §Sidebar). In this one table like every other
 * chord, so `findChordConflict` covers it.
 */
export const SHORTCUT_TOGGLE_SIDEBAR: KeyBinding = {
	id: KEY_ACTION.toggleSidebar,
	key: "b",
	modifier: KEY_MODIFIER.command,
	label: chordLabel("B"),
	description: "Toggle sidebar",
};

/**
 * ⌘⌥W: close every tab **but** the press's own — M5.1's tab menu, a second registry
 * row rather than a second list.
 */
export const SHORTCUT_CLOSE_OTHERS: KeyBinding = {
	id: KEY_ACTION.closeOtherTabs,
	key: "w",
	modifier: KEY_MODIFIER.commandAlt,
	label: commandAltChordLabel("W"),
	description: "Close other tabs",
};

/** Every row of the map, in the order the help UI shows them. */
export const KEYBOARD_SHORTCUTS: readonly KeyBinding[] = [
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_NEW_SESSION,
	SHORTCUT_CLOSE_TAB,
	SHORTCUT_CLOSE_OTHERS,
	SHORTCUT_SWITCH_TAB,
	SHORTCUT_SETTINGS,
	SHORTCUT_TOGGLE_SIDEBAR,
	SHORTCUT_SEND,
	SHORTCUT_INTERRUPT,
	SHORTCUT_CONTEXT_MENU,
	SHORTCUT_BAND_PREVIOUS,
	SHORTCUT_BAND_NEXT,
];

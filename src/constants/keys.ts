import {
	chordLabel,
	KEY_ESCAPE_LABEL,
	KEY_MODIFIER,
	type KeyBinding,
	tabRangeLabel,
} from "@/constants/chords";

/**
 * The keyboard map (spec 010 §Desktop behaviours): **one table**, so the palette's
 * help and every handler read the same declaration and no chord is claimed twice.
 *
 * The chord algebra — labelling, identity and matching — lives next door in
 * `chords.ts`; this file is the map itself.
 *
 * The tab-strip rows are consumed by `src/app/tabKeys.ts`; `⌘K`, `⌘,` and `⌘B` by
 * `src/app/keymap.ts`. A chord's label is *composed* from `chordLabel` and its
 * key — never typed as a glyph — so `⌘1…⌘9` is a range the bounds build.
 */

/**
 * `Escape` has **no chord row** in the map: it is not a window shortcut but the
 * key a surface, popover or dialog recognises as its own dismissal. It is named
 * here all the same, so the two places that match it hold no literal.
 */
export const KEY_ESCAPE = "Escape";

/** The action each chord names — the map's vocabulary. */
export const KEY_ACTION = {
	commandPalette: "command-palette",
	newSession: "new-session",
	closeTab: "close-tab",
	switchTab: "switch-tab",
	settings: "settings",
	toggleSidebar: "toggle-sidebar",
	sendPrompt: "send-prompt",
	interrupt: "interrupt",
} as const;

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

/**
 * ⌘1…⌘9: switch by strip index. One row with a range, not nine rows, so the
 * table stays the size of the behaviour.
 */
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
 * ⌘B: toggle the sidebar (spec 020 §Sidebar). It lives in this one table like
 * every other chord, so `findChordConflict` covers it — a second binding on ⌘B
 * fails the registry's test rather than shadowing this one.
 */
export const SHORTCUT_TOGGLE_SIDEBAR: KeyBinding = {
	id: KEY_ACTION.toggleSidebar,
	key: "b",
	modifier: KEY_MODIFIER.command,
	label: chordLabel("B"),
	description: "Toggle sidebar",
};

/**
 * ⌘↩: send the prompt (spec 010 §Desktop behaviours' map; spec 020 §Prompt box
 * documents the other reading — see the report's error list). It is matched by the
 * **composer**, not by a window handler, because only the composer knows whether its
 * field has focus; the row is in this table so the help lists it and the
 * chord-uniqueness test covers it.
 */
export const SHORTCUT_SEND: KeyBinding = {
	id: KEY_ACTION.sendPrompt,
	key: "Enter",
	modifier: KEY_MODIFIER.command,
	label: chordLabel("↩"),
	description: "Send prompt",
};

/**
 * `Esc`: interrupt a running turn. A bare key, so it is the one row with
 * `KEY_MODIFIER.none`. The composer matches it through the registry and only acts
 * while the store says a turn is running (requirement 2).
 */
export const SHORTCUT_INTERRUPT: KeyBinding = {
	id: KEY_ACTION.interrupt,
	key: "Escape",
	modifier: KEY_MODIFIER.none,
	label: KEY_ESCAPE_LABEL,
	description: "Interrupt a running turn",
};

/** Every row of the map, in the order the help UI shows them. */
export const KEYBOARD_SHORTCUTS: readonly KeyBinding[] = [
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_NEW_SESSION,
	SHORTCUT_CLOSE_TAB,
	SHORTCUT_SWITCH_TAB,
	SHORTCUT_SETTINGS,
	SHORTCUT_TOGGLE_SIDEBAR,
	SHORTCUT_SEND,
	SHORTCUT_INTERRUPT,
];

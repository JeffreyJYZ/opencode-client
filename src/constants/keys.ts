/**
 * The keyboard map's M1.1 rows (spec 010 §Desktop behaviours).
 *
 * One table, so the palette's help (M1.6) can render it without a second copy.
 * Only the tab-strip rows live here — ⌘B/⌘K and the rest are M1.6/M2.7's.
 */

/** A modifier held with the key. */
export const KEY_MODIFIER = {
	command: "command",
} as const;

/** The glyph the help UI shows for the modifier. */
export const KEY_MODIFIER_GLYPH = "⌘";

/** One row of the map: what the shortcut does and how it is shown. */
export type KeyBinding = {
	readonly id: string;
	/** The `KeyboardEvent.key` value, matched case-insensitively. */
	readonly key: string;
	readonly modifier: (typeof KEY_MODIFIER)[keyof typeof KEY_MODIFIER];
	/** What the help UI prints, e.g. `⌘T`. */
	readonly label: string;
	readonly description: string;
};

export const KEY_ACTION = {
	newSession: "new-session",
	closeTab: "close-tab",
	switchTab: "switch-tab",
} as const;

/** ⌘T: the affordance M1.3 fills with session creation. */
export const SHORTCUT_NEW_SESSION: KeyBinding = {
	id: KEY_ACTION.newSession,
	key: "t",
	modifier: KEY_MODIFIER.command,
	label: `${KEY_MODIFIER_GLYPH}T`,
	description: "New session",
};

/** ⌘W: close the active tab. The session itself keeps running. */
export const SHORTCUT_CLOSE_TAB: KeyBinding = {
	id: KEY_ACTION.closeTab,
	key: "w",
	modifier: KEY_MODIFIER.command,
	label: `${KEY_MODIFIER_GLYPH}W`,
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
	label: `${KEY_MODIFIER_GLYPH}1…${KEY_MODIFIER_GLYPH}9`,
	description: "Switch tab",
};

/** The first and last strip positions reachable by keyboard. */
export const MIN_KEYBOARD_TAB = 1;
export const MAX_KEYBOARD_TAB = 9;

/** Every M1.1 row of the map, in the order the help UI shows them. */
export const KEYBOARD_SHORTCUTS: readonly KeyBinding[] = [
	SHORTCUT_NEW_SESSION,
	SHORTCUT_CLOSE_TAB,
	SHORTCUT_SWITCH_TAB,
];

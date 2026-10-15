/**
 * The keyboard map (spec 010 §Desktop behaviours): **one table**, so the palette's
 * help and every handler read the same declaration and no chord is claimed twice.
 *
 * The tab-strip rows are consumed by `src/app/tabKeys.ts`; `⌘K` and `⌘,` by
 * `src/app/keymap.ts`. A chord's label is *composed* from `KEY_MODIFIER_GLYPH`
 * and its key — never typed as a glyph — so `⌘1…⌘9` is a range the bounds build.
 */

/** A modifier held with the key. */
export const KEY_MODIFIER = {
	command: "command",
} as const;

export type KeyModifier = (typeof KEY_MODIFIER)[keyof typeof KEY_MODIFIER];

/** The glyph the help UI shows for the modifier. */
export const KEY_MODIFIER_GLYPH = "⌘";

/** What separates the two ends of a chord range (`⌘1…⌘9`). */
export const CHORD_RANGE_SEPARATOR = "…";

/** The first and last strip positions reachable by keyboard. */
export const MIN_KEYBOARD_TAB = 1;
export const MAX_KEYBOARD_TAB = 9;

/** One row of the map: what the shortcut does and how it is shown. */
export type KeyBinding = {
	readonly id: string;
	/** The `KeyboardEvent.key` value, matched case-insensitively. */
	readonly key: string;
	readonly modifier: KeyModifier;
	/** What the help UI prints, e.g. `⌘T`. */
	readonly label: string;
	readonly description: string;
};

/** A one-key chord's label: the modifier glyph plus the key. */
export function chordLabel(key: string): string {
	return `${KEY_MODIFIER_GLYPH}${key.toUpperCase()}`;
}

/** `⌘1…⌘9`, composed from the bounds so no surface types the range glyph. */
export function tabRangeLabel(): string {
	return `${chordLabel(String(MIN_KEYBOARD_TAB))}${CHORD_RANGE_SEPARATOR}${chordLabel(
		String(MAX_KEYBOARD_TAB),
	)}`;
}

/** The action each chord names — the map's vocabulary. */
export const KEY_ACTION = {
	commandPalette: "command-palette",
	newSession: "new-session",
	closeTab: "close-tab",
	switchTab: "switch-tab",
	settings: "settings",
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

/** Every row of the map, in the order the help UI shows them. */
export const KEYBOARD_SHORTCUTS: readonly KeyBinding[] = [
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_NEW_SESSION,
	SHORTCUT_CLOSE_TAB,
	SHORTCUT_SWITCH_TAB,
	SHORTCUT_SETTINGS,
];

/** A chord's unique identity: its modifier and its key, case-folded. */
export function bindingChord(binding: KeyBinding): string {
	return `${binding.modifier}:${binding.key.toLowerCase()}`;
}

/**
 * The first chord two bindings claim, or `null` when every chord is unique. A
 * conflict is a real defect, so it is checked, not assumed.
 */
export function findChordConflict(bindings: readonly KeyBinding[]): string | null {
	const seen = new Set<string>();
	for (const binding of bindings) {
		const chord = bindingChord(binding);
		if (seen.has(chord)) return chord;
		seen.add(chord);
	}
	return null;
}

/** Whether an event names the binding's chord. The modifier is checked here. */
export function matchesBinding(
	event: { readonly key: string; readonly metaKey: boolean; readonly ctrlKey: boolean },
	binding: KeyBinding,
): boolean {
	if (event.key.toLowerCase() !== binding.key.toLowerCase()) return false;
	const held = event.metaKey || event.ctrlKey;
	if (binding.modifier === KEY_MODIFIER.command) return held;
	return !held;
}

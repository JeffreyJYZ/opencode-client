/**
 * The chord algebra (spec 010 §Desktop behaviours): how a binding is labelled,
 * identified and matched. Split from `keys.ts` so that file is the **map** —
 * data — and this one the **arithmetic** the help table and every handler share.
 */

/** A modifier held with the key. */
export const KEY_MODIFIER = {
	command: "command",
	/** `⌘⌥`: a command chord that also holds Option (M5.1's close-other-tabs). */
	commandAlt: "command-alt",
	/** `⇧`: a shift chord (M5.1's `⇧F10` context menu — the platform's own menu key). */
	shift: "shift",
	/** No modifier: a bare key such as `Escape` (M2.5's interrupt). */
	none: "none",
} as const;

export type KeyModifier = (typeof KEY_MODIFIER)[keyof typeof KEY_MODIFIER];

/** The glyph the help UI shows for the modifier. */
export const KEY_MODIFIER_GLYPH = "⌘";
/** The Option and Shift glyphs, for the two composite chords above. */
export const KEY_MODIFIER_ALT_GLYPH = "⌥";
export const KEY_MODIFIER_SHIFT_GLYPH = "⇧";

/** The labelless keys the map names, so no surface types their word. */
export const KEY_ESCAPE_LABEL = "Esc";

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

/** `⌘⌥<key>`: a command+option chord's label (M5.1's close-other-tabs). */
export function commandAltChordLabel(key: string): string {
	return `${KEY_MODIFIER_GLYPH}${KEY_MODIFIER_ALT_GLYPH}${key.toUpperCase()}`;
}

/** `⇧<key>`: a shift chord's label (M5.1's `⇧F10`). */
export function shiftChordLabel(key: string): string {
	return `${KEY_MODIFIER_SHIFT_GLYPH}${key.toUpperCase()}`;
}

/** `⌘1…⌘9`, composed from the bounds so no surface types the range glyph. */
export function tabRangeLabel(): string {
	return `${chordLabel(String(MIN_KEYBOARD_TAB))}${CHORD_RANGE_SEPARATOR}${chordLabel(
		String(MAX_KEYBOARD_TAB),
	)}`;
}

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

/**
 * The part of a key event a binding is matched against. The two modifier keys a
 * chord does not name default to "not held", so a DOM event and a hand-built
 * record match the same way.
 */
export type KeyEventLike = {
	readonly key: string;
	readonly metaKey: boolean;
	readonly ctrlKey: boolean;
	readonly altKey?: boolean;
	readonly shiftKey?: boolean;
};

/**
 * Whether an event names the binding's chord. The modifier is checked here, and
 * exactly: `⌘W` does not match a `⌘⌥W` press and vice versa, so two rows of the
 * map can never shadow each other. `none` tolerates Shift, because `⇧Esc` is the
 * same interrupt as `Esc` (M2.5) and nothing binds a bare shifted key.
 */
export function matchesBinding(event: KeyEventLike, binding: KeyBinding): boolean {
	if (event.key.toLowerCase() !== binding.key.toLowerCase()) return false;
	const command = event.metaKey || event.ctrlKey;
	const alt = event.altKey === true;
	if (binding.modifier === KEY_MODIFIER.command) return command && !alt;
	if (binding.modifier === KEY_MODIFIER.commandAlt) return command && alt;
	if (binding.modifier === KEY_MODIFIER.shift) return event.shiftKey === true && !command && !alt;
	return !command && !alt;
}

/**
 * The action each chord names — the map's vocabulary (M1.6). It lives here, not in
 * `keys.ts`, because the bindings plus this map overran the 150-line cap once two
 * branches' chords met in a merge; `keys.ts` re-exports it, so callers are unchanged.
 */
export const KEY_ACTION = {
	commandPalette: "command-palette",
	newSession: "new-session",
	closeTab: "close-tab",
	closeOtherTabs: "close-other-tabs",
	switchTab: "switch-tab",
	settings: "settings",
	toggleSidebar: "toggle-sidebar",
	sendPrompt: "send-prompt",
	interrupt: "interrupt",
	contextMenu: "context-menu",
} as const;

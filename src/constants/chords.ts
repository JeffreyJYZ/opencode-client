/**
 * The chord algebra (spec 010 §Desktop behaviours): how a binding is labelled,
 * identified and matched. Split from `keys.ts` so that file is the **map** —
 * data — and this one the **arithmetic** the help table and every handler share.
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

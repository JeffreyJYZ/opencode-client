import { parseChordLabel } from "@/constants/chordParse";
import { bindingChord, type Chord } from "@/constants/chords";
import { KEYBOARD_SHORTCUTS } from "@/constants/keys";

/**
 * The **keybinding half** of the command registry (M4.19), split from `commands.ts`
 * so both stay under the file cap. A plugin's `keybinding` is a chord **label**
 * (`⌘K`, `⌘⌥W`, `⇧F10`, `Esc`) — the palette shows that same string — and a chord
 * that cannot be bound is refused rather than shown.
 */

/** The chord a `keybinding` names, or `null` for none or an unparseable label. */
export function keybindingChord(keybinding: string | undefined): Chord | null {
	if (keybinding === undefined) return null;
	return parseChordLabel(keybinding);
}

/**
 * The label of the chord `chord` collides with, or `null`. The app's own table is
 * checked first, so a plugin can never shadow `⌘K`; then the keybindings already
 * registered, so two plugins cannot claim one chord either.
 */
export function keybindingConflict(
	chord: Chord,
	registered: readonly (string | undefined)[],
): string | null {
	const identity = bindingChord(chord);
	for (const shortcut of KEYBOARD_SHORTCUTS) {
		if (bindingChord(shortcut) === identity) return shortcut.label;
	}
	for (const keybinding of registered) {
		const bound = keybindingChord(keybinding);
		if (bound !== null && bindingChord(bound) === identity) return keybinding ?? identity;
	}
	return null;
}

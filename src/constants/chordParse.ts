import {
	type Chord,
	KEY_ESCAPE_LABEL,
	KEY_MODIFIER,
	KEY_MODIFIER_ALT_GLYPH,
	KEY_MODIFIER_GLYPH,
	KEY_MODIFIER_SHIFT_GLYPH,
	type KeyModifier,
} from "@/constants/chords";
import { KEY_ESCAPE } from "@/constants/keys";

/**
 * The **inverse of the label composers** in `chords.ts`, and the one wire format a
 * plugin's `keybinding` speaks (M4.19): the label the palette shows (`⌘K`, `⌘⌥W`,
 * `⇧F10`, `Esc`). Display and binding are therefore one string read twice, so they
 * cannot diverge. A label that is none of those four shapes parses to `null` — the
 * registry refuses it rather than showing a chord nothing can deliver.
 */

/** A chord from its label, or `null` when the label is not a chord. */
export function parseChordLabel(label: string): Chord | null {
	if (label === KEY_ESCAPE_LABEL) return { modifier: KEY_MODIFIER.none, key: KEY_ESCAPE };
	// The two-glyph prefix is checked first: `⌘⌥W` must not parse as a command chord
	// whose key is `⌥W`.
	if (label.startsWith(`${KEY_MODIFIER_GLYPH}${KEY_MODIFIER_ALT_GLYPH}`)) {
		return chord(label.slice(2), KEY_MODIFIER.commandAlt);
	}
	if (label.startsWith(KEY_MODIFIER_GLYPH)) return chord(label.slice(1), KEY_MODIFIER.command);
	if (label.startsWith(KEY_MODIFIER_SHIFT_GLYPH))
		return chord(label.slice(1), KEY_MODIFIER.shift);
	return null;
}

/** A chord from a glyph-stripped key, or `null` when no key remains (`⌘` alone). */
function chord(key: string, modifier: KeyModifier): Chord | null {
	return key === "" ? null : { modifier, key };
}

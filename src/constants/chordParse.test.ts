import { describe, expect, test } from "bun:test";
import { parseChordLabel } from "@/constants/chordParse";
import {
	bindingChord,
	type Chord,
	chordLabel,
	commandAltChordLabel,
	KEY_ESCAPE_LABEL,
	KEY_MODIFIER,
	KEY_MODIFIER_ALT_GLYPH,
	KEY_MODIFIER_GLYPH,
	shiftChordLabel,
} from "@/constants/chords";
import {
	KEY_ESCAPE,
	SHORTCUT_CLOSE_OTHERS,
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_CONTEXT_MENU,
	SHORTCUT_INTERRUPT,
} from "@/constants/keys";

/**
 * M4.19: the wire format is the chord **label**, and `parseChordLabel` is the
 * inverse of the label composers — so a chord the palette shows and a chord the
 * keymap matches are one string read twice.
 */

/** The parsed chord, failing loudly rather than hiding a `null` behind `??`. */
function parsed(label: string): Chord {
	const chord = parseChordLabel(label);
	if (chord === null) throw new Error(`expected "${label}" to parse`);
	return chord;
}

describe("the chord-label parse", () => {
	test("each composer's label parses back to the chord it was composed from", () => {
		expect(parseChordLabel(chordLabel("K"))).toEqual({
			modifier: KEY_MODIFIER.command,
			key: "K",
		});
		expect(parseChordLabel(commandAltChordLabel("W"))).toEqual({
			modifier: KEY_MODIFIER.commandAlt,
			key: "W",
		});
		expect(parseChordLabel(shiftChordLabel("F10"))).toEqual({
			modifier: KEY_MODIFIER.shift,
			key: "F10",
		});
		expect(parseChordLabel(KEY_ESCAPE_LABEL)).toEqual({
			modifier: KEY_MODIFIER.none,
			key: KEY_ESCAPE,
		});
	});

	test("a parsed label round-trips to the binding's own identity", () => {
		expect(bindingChord(parsed(SHORTCUT_COMMAND_PALETTE.label))).toBe(
			bindingChord(SHORTCUT_COMMAND_PALETTE),
		);
		expect(bindingChord(parsed(SHORTCUT_CLOSE_OTHERS.label))).toBe(
			bindingChord(SHORTCUT_CLOSE_OTHERS),
		);
		expect(bindingChord(parsed(SHORTCUT_CONTEXT_MENU.label))).toBe(
			bindingChord(SHORTCUT_CONTEXT_MENU),
		);
		expect(bindingChord(parsed(SHORTCUT_INTERRUPT.label))).toBe(
			bindingChord(SHORTCUT_INTERRUPT),
		);
	});

	test("the two-glyph chord is not read as a command chord on the alt glyph", () => {
		// `⌘⌥W` must be command-alt, never `command` with the key `⌥W`.
		expect(parsed(commandAltChordLabel("W")).key).toBe("W");
		expect(parsed(commandAltChordLabel("W")).modifier).toBe(KEY_MODIFIER.commandAlt);
	});

	test("a malformed label parses to null, never a guessed chord", () => {
		for (const bad of [
			"mod+shift+e",
			"",
			"K",
			KEY_MODIFIER_GLYPH,
			`${KEY_MODIFIER_GLYPH}${KEY_MODIFIER_ALT_GLYPH}`,
			"Ctrl+K",
		]) {
			expect(parseChordLabel(bad)).toBeNull();
		}
	});
});

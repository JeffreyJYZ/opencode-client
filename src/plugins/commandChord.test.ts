import { describe, expect, test } from "bun:test";
import { chordLabel, commandAltChordLabel, KEY_MODIFIER } from "@/constants/chords";
import { SHORTCUT_COMMAND_PALETTE } from "@/constants/keys";
import { keybindingChord, keybindingConflict } from "@/plugins/commandChord";

/** M4.19: the command keybinding seam on its own — parse a label, then find a clash. */

describe("a command keybinding", () => {
	test("parses a chord label, and nothing else", () => {
		expect(keybindingChord(undefined)).toBeNull();
		expect(keybindingChord("mod+e")).toBeNull();
		expect(keybindingChord(chordLabel("E"))).toEqual({
			modifier: KEY_MODIFIER.command,
			key: "E",
		});
		expect(keybindingChord(commandAltChordLabel("W"))?.modifier).toBe(KEY_MODIFIER.commandAlt);
	});

	test("conflicts with the app's own chords, naming the chord", () => {
		const chord = keybindingChord(SHORTCUT_COMMAND_PALETTE.label);
		if (chord === null) throw new Error("expected the app chord to parse");
		expect(keybindingConflict(chord, [])).toBe(SHORTCUT_COMMAND_PALETTE.label);
	});

	test("conflicts with an already-registered plugin chord", () => {
		const chord = keybindingChord(chordLabel("E"));
		if (chord === null) throw new Error("expected the chord to parse");
		expect(keybindingConflict(chord, [chordLabel("E")])).toBe(chordLabel("E"));
		expect(keybindingConflict(chord, [chordLabel("J")])).toBeNull();
	});
});

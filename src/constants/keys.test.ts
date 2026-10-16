import { describe, expect, test } from "bun:test";
import {
	altChordLabel,
	bindingChord,
	chordLabel,
	commandAltChordLabel,
	findChordConflict,
	KEY_MODIFIER,
	KEY_MODIFIER_ALT_GLYPH,
	KEY_MODIFIER_GLYPH,
	KEY_MODIFIER_SHIFT_GLYPH,
	MAX_KEYBOARD_TAB,
	MIN_KEYBOARD_TAB,
	matchesBinding,
	shiftChordLabel,
	tabRangeLabel,
} from "@/constants/chords";
import {
	KEYBOARD_SHORTCUTS,
	SHORTCUT_BAND_NEXT,
	SHORTCUT_BAND_PREVIOUS,
	SHORTCUT_CLOSE_OTHERS,
	SHORTCUT_CLOSE_TAB,
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_CONTEXT_MENU,
	SHORTCUT_INTERRUPT,
	SHORTCUT_NEW_SESSION,
	SHORTCUT_SETTINGS,
	SHORTCUT_SWITCH_TAB,
	SHORTCUT_TOGGLE_SIDEBAR,
} from "@/constants/keys";

function event(key: string, held = true): KeyboardEvent {
	return new KeyboardEvent("keydown", { key, metaKey: held, ctrlKey: false, bubbles: true });
}

/** The same event with Option, Shift and/or Command held, for the composite chords. */
function held(key: string, altKey: boolean, shiftKey: boolean, metaKey = true): KeyboardEvent {
	return new KeyboardEvent("keydown", { key, metaKey, altKey, shiftKey, bubbles: true });
}

describe("the keymap registry", () => {
	test("no chord is claimed twice", () => {
		expect(findChordConflict(KEYBOARD_SHORTCUTS)).toBeNull();
		// The check is real: a second binding on ⌘K is a conflict, not a warning.
		const clash = findChordConflict([...KEYBOARD_SHORTCUTS, SHORTCUT_COMMAND_PALETTE]);
		expect(clash).toBe(bindingChord(SHORTCUT_COMMAND_PALETTE));
		// And a second binding on ⌘B now fails too, so it cannot shadow M2.7's.
		expect(findChordConflict([...KEYBOARD_SHORTCUTS, SHORTCUT_TOGGLE_SIDEBAR])).toBe(
			bindingChord(SHORTCUT_TOGGLE_SIDEBAR),
		);
	});

	test("every chord the app owns is in the one table", () => {
		const ids = KEYBOARD_SHORTCUTS.map((binding) => binding.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const binding of [
			SHORTCUT_COMMAND_PALETTE,
			SHORTCUT_NEW_SESSION,
			SHORTCUT_CLOSE_TAB,
			SHORTCUT_CLOSE_OTHERS,
			SHORTCUT_SWITCH_TAB,
			SHORTCUT_SETTINGS,
			SHORTCUT_TOGGLE_SIDEBAR,
			SHORTCUT_INTERRUPT,
			SHORTCUT_CONTEXT_MENU,
			SHORTCUT_BAND_PREVIOUS,
			SHORTCUT_BAND_NEXT,
		]) {
			expect(ids).toContain(binding.id);
		}
	});

	test("both band chords are rows of the map, so the conflict check polices them", () => {
		expect(KEYBOARD_SHORTCUTS).toContain(SHORTCUT_BAND_PREVIOUS);
		expect(KEYBOARD_SHORTCUTS).toContain(SHORTCUT_BAND_NEXT);
		expect(findChordConflict([...KEYBOARD_SHORTCUTS, SHORTCUT_BAND_PREVIOUS])).toBe(
			bindingChord(SHORTCUT_BAND_PREVIOUS),
		);
		expect(findChordConflict([...KEYBOARD_SHORTCUTS, SHORTCUT_BAND_NEXT])).toBe(
			bindingChord(SHORTCUT_BAND_NEXT),
		);
	});

	test("the two composite chords are labelled from the glyph constants", () => {
		expect(commandAltChordLabel("W")).toBe(`${KEY_MODIFIER_GLYPH}${KEY_MODIFIER_ALT_GLYPH}W`);
		expect(SHORTCUT_CLOSE_OTHERS.label).toBe(`${KEY_MODIFIER_GLYPH}${KEY_MODIFIER_ALT_GLYPH}W`);
		expect(shiftChordLabel("f10")).toBe(`${KEY_MODIFIER_SHIFT_GLYPH}F10`);
		expect(SHORTCUT_CONTEXT_MENU.label).toBe(`${KEY_MODIFIER_SHIFT_GLYPH}F10`);
		// `⌥↑` is the Option glyph **alone** — not the ⌘⌥ composite.
		expect(altChordLabel("↑")).toBe(`${KEY_MODIFIER_ALT_GLYPH}↑`);
		expect(SHORTCUT_BAND_PREVIOUS.label).toBe(`${KEY_MODIFIER_ALT_GLYPH}↑`);
	});

	test("the modifier is compared exactly, so ⌘W and ⌘⌥W never shadow each other", () => {
		expect(matchesBinding(held("w", false, false), SHORTCUT_CLOSE_TAB)).toBe(true);
		expect(matchesBinding(held("w", true, false), SHORTCUT_CLOSE_TAB)).toBe(false);
		expect(matchesBinding(held("w", true, false), SHORTCUT_CLOSE_OTHERS)).toBe(true);
		expect(matchesBinding(held("w", false, false), SHORTCUT_CLOSE_OTHERS)).toBe(false);
		// `⇧F10` needs Shift and **no** command key; `Esc` still tolerates `⇧Esc`.
		expect(matchesBinding(held("F10", false, true, false), SHORTCUT_CONTEXT_MENU)).toBe(true);
		expect(matchesBinding(held("F10", false, false), SHORTCUT_CONTEXT_MENU)).toBe(false);
		expect(matchesBinding(held("F10", false, true), SHORTCUT_CONTEXT_MENU)).toBe(false);
		expect(matchesBinding(held("Escape", false, true, false), SHORTCUT_INTERRUPT)).toBe(true);
		expect(matchesBinding(held("Escape", true, false), SHORTCUT_INTERRUPT)).toBe(false);
		// `⌥↑` is Option **without** Command, and ⌘⌥↑ is not it.
		expect(matchesBinding(held("ArrowUp", true, false, false), SHORTCUT_BAND_PREVIOUS)).toBe(
			true,
		);
		expect(matchesBinding(held("ArrowUp", true, false, true), SHORTCUT_BAND_PREVIOUS)).toBe(
			false,
		);
		expect(matchesBinding(held("ArrowUp", false, false, false), SHORTCUT_BAND_PREVIOUS)).toBe(
			false,
		);
	});

	test("labels are composed from the modifier glyph, never typed as a range", () => {
		expect(chordLabel("K")).toBe(`${KEY_MODIFIER_GLYPH}K`);
		expect(SHORTCUT_COMMAND_PALETTE.label).toBe(`${KEY_MODIFIER_GLYPH}K`);
		expect(SHORTCUT_SETTINGS.label).toBe(`${KEY_MODIFIER_GLYPH},`);
		// `⌘1…⌘9` is built from the bounds, so the range cannot drift from them.
		const range = tabRangeLabel();
		expect(range).toBe(
			`${KEY_MODIFIER_GLYPH}${MIN_KEYBOARD_TAB}…${KEY_MODIFIER_GLYPH}${MAX_KEYBOARD_TAB}`,
		);
		expect(SHORTCUT_SWITCH_TAB.label).toBe(range);
	});

	test("matchesBinding checks the modifier and folds case", () => {
		expect(matchesBinding(event("K"), SHORTCUT_COMMAND_PALETTE)).toBe(true);
		expect(matchesBinding(event("k"), SHORTCUT_COMMAND_PALETTE)).toBe(true);
		expect(matchesBinding(event("k", false), SHORTCUT_COMMAND_PALETTE)).toBe(false);
		expect(matchesBinding(event("t"), SHORTCUT_COMMAND_PALETTE)).toBe(false);
		expect(SHORTCUT_SETTINGS.modifier).toBe(KEY_MODIFIER.command);
		expect(SHORTCUT_SETTINGS.key).toBe(",");
	});
});

import { describe, expect, test } from "bun:test";
import {
	bindingChord,
	chordLabel,
	findChordConflict,
	KEY_MODIFIER,
	KEY_MODIFIER_GLYPH,
	KEYBOARD_SHORTCUTS,
	MAX_KEYBOARD_TAB,
	MIN_KEYBOARD_TAB,
	matchesBinding,
	SHORTCUT_CLOSE_TAB,
	SHORTCUT_COMMAND_PALETTE,
	SHORTCUT_NEW_SESSION,
	SHORTCUT_SETTINGS,
	SHORTCUT_SWITCH_TAB,
	tabRangeLabel,
} from "@/constants/keys";

function event(key: string, held = true): KeyboardEvent {
	return new KeyboardEvent("keydown", { key, metaKey: held, ctrlKey: false, bubbles: true });
}

describe("the keymap registry", () => {
	test("no chord is claimed twice", () => {
		expect(findChordConflict(KEYBOARD_SHORTCUTS)).toBeNull();
		// The check is real: a second binding on ⌘K is a conflict, not a warning.
		const clash = findChordConflict([...KEYBOARD_SHORTCUTS, SHORTCUT_COMMAND_PALETTE]);
		expect(clash).toBe(bindingChord(SHORTCUT_COMMAND_PALETTE));
	});

	test("every chord the app owns is in the one table", () => {
		const ids = KEYBOARD_SHORTCUTS.map((binding) => binding.id);
		expect(new Set(ids).size).toBe(ids.length);
		for (const binding of [
			SHORTCUT_COMMAND_PALETTE,
			SHORTCUT_NEW_SESSION,
			SHORTCUT_CLOSE_TAB,
			SHORTCUT_SWITCH_TAB,
			SHORTCUT_SETTINGS,
		]) {
			expect(ids).toContain(binding.id);
		}
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

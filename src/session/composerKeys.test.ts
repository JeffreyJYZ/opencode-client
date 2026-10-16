import { describe, expect, test } from "bun:test";
import { KEY_MODIFIER } from "@/constants/chords";
import { SHORTCUT_INTERRUPT, SHORTCUT_SEND } from "@/constants/keys";
import { COMPOSER_ACTION, type ComposerKeyInput, composerAction } from "@/session/composerKeys";

/**
 * The composer's keyboard rules (M2.5). Four orderings decide the box's behaviour,
 * and each is a case here: the menu owns Enter/Tab/Escape while it is open, `⌘↩`
 * sends, `↩` is a newline, and **Escape only interrupts when the store says a turn
 * runs** — so pressing it while nothing runs is impossible, not merely useless.
 */

function key(overrides: Partial<ComposerKeyInput>): ComposerKeyInput {
	return {
		key: "a",
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		menuOpen: false,
		running: false,
		...overrides,
	};
}

describe("the composer's keys", () => {
	test("⌘↩ sends, and ↩ alone is a newline", () => {
		expect(composerAction(key({ key: "Enter", metaKey: true }))).toBe(COMPOSER_ACTION.send);
		expect(composerAction(key({ key: "Enter", ctrlKey: true }))).toBe(COMPOSER_ACTION.send);
		expect(composerAction(key({ key: "Enter" }))).toBe(COMPOSER_ACTION.newline);
		expect(SHORTCUT_SEND.modifier).toBe(KEY_MODIFIER.command);
	});

	test("Escape interrupts only while a turn runs", () => {
		expect(composerAction(key({ key: "Escape", running: true }))).toBe(
			COMPOSER_ACTION.interrupt,
		);
		expect(composerAction(key({ key: "Escape", running: false }))).toBe(COMPOSER_ACTION.none);
	});

	test("with the menu open, Escape closes the menu and nothing else", () => {
		expect(composerAction(key({ key: "Escape", menuOpen: true, running: true }))).toBe(
			COMPOSER_ACTION.menuClose,
		);
	});

	test("with the menu open, Enter and Tab accept and the arrows move", () => {
		expect(composerAction(key({ key: "Enter", menuOpen: true, metaKey: true }))).toBe(
			COMPOSER_ACTION.menuAccept,
		);
		expect(composerAction(key({ key: "Tab", menuOpen: true }))).toBe(
			COMPOSER_ACTION.menuAccept,
		);
		expect(composerAction(key({ key: "ArrowDown", menuOpen: true }))).toBe(
			COMPOSER_ACTION.menuNext,
		);
		expect(composerAction(key({ key: "ArrowUp", menuOpen: true }))).toBe(
			COMPOSER_ACTION.menuPrev,
		);
	});

	test("the interrupt chord is the registry's own row", () => {
		expect(SHORTCUT_INTERRUPT.key).toBe("Escape");
		expect(SHORTCUT_INTERRUPT.modifier).toBe(KEY_MODIFIER.none);
		expect(composerAction(key({ key: "Escape", shiftKey: true, running: true }))).toBe(
			COMPOSER_ACTION.interrupt,
		);
	});
});

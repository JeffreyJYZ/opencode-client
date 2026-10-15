import { describe, expect, test } from "bun:test";
import { handleTabKey, indexForDigit, matchesShortcut, type TabKeyActions } from "@/app/tabKeys";
import { SHORTCUT_CLOSE_TAB, SHORTCUT_NEW_SESSION } from "@/constants/keys";

function keydown(key: string, metaKey: boolean): KeyboardEvent {
	return new KeyboardEvent("keydown", { key, metaKey, bubbles: true, cancelable: true });
}

function spy(): TabKeyActions & { calls: string[] } {
	const calls: string[] = [];
	return {
		calls,
		onNewSession: () => calls.push("new"),
		onCloseActive: () => calls.push("close"),
		onSwitchTab: (index: number) => calls.push(`switch:${index}`),
	};
}

describe("tabKeys", () => {
	test("⌘1 is the first tab and a digit past the strip is a no-op", () => {
		expect(indexForDigit("1", 3)).toBe(0);
		expect(indexForDigit("3", 3)).toBe(2);
		expect(indexForDigit("4", 3)).toBeNull();
		expect(indexForDigit("9", 0)).toBeNull();
		expect(indexForDigit("0", 3)).toBeNull();
		expect(indexForDigit("t", 3)).toBeNull();
	});

	test("matching is case-insensitive", () => {
		expect(
			matchesShortcut({ key: "T", metaKey: true, ctrlKey: false }, SHORTCUT_NEW_SESSION),
		).toBe(true);
		expect(
			matchesShortcut({ key: "x", metaKey: true, ctrlKey: false }, SHORTCUT_CLOSE_TAB),
		).toBe(false);
	});

	test("⌘W closes only the active tab", () => {
		const actions = spy();
		expect(handleTabKey(keydown("w", true), 3, actions)).toBe(true);
		expect(actions.calls).toEqual(["close"]);
	});

	test("⌘T asks for a new session", () => {
		const actions = spy();
		expect(handleTabKey(keydown("t", true), 2, actions)).toBe(true);
		expect(actions.calls).toEqual(["new"]);
	});

	test("⌘2 switches to the second tab; ⌘9 with two tabs does nothing", () => {
		const actions = spy();
		expect(handleTabKey(keydown("2", true), 2, actions)).toBe(true);
		expect(handleTabKey(keydown("9", true), 2, actions)).toBe(false);
		expect(actions.calls).toEqual(["switch:1"]);
	});

	test("a keypress without the modifier is ignored", () => {
		const actions = spy();
		expect(handleTabKey(keydown("w", false), 2, actions)).toBe(false);
		expect(actions.calls).toEqual([]);
	});

	test("⌘W and ⌘T are inert while a modal is open", () => {
		const actions = spy();
		expect(handleTabKey(keydown("w", true), 3, actions, true)).toBe(false);
		expect(handleTabKey(keydown("t", true), 3, actions, true)).toBe(false);
		expect(handleTabKey(keydown("1", true), 3, actions, true)).toBe(false);
		expect(actions.calls).toEqual([]);
	});
});

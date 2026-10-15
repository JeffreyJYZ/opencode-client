import { describe, expect, test } from "bun:test";
import { handleAppKey, type KeymapActions } from "@/app/keymap";

function keydown(key: string, held = true): KeyboardEvent {
	return new KeyboardEvent("keydown", {
		key,
		metaKey: held,
		ctrlKey: false,
		bubbles: true,
		cancelable: true,
	});
}

function spy(): KeymapActions & { calls: string[] } {
	const calls: string[] = [];
	return {
		calls,
		onCommandPalette: () => calls.push("palette"),
		onSettings: () => calls.push("settings"),
	};
}

describe("keymap", () => {
	test("⌘K opens the palette and is consumed", () => {
		const actions = spy();
		expect(handleAppKey(keydown("k"), actions)).toBe(true);
		expect(actions.calls).toEqual(["palette"]);
	});

	test("⌘, opens settings and is consumed", () => {
		const actions = spy();
		expect(handleAppKey(keydown(","), actions)).toBe(true);
		expect(actions.calls).toEqual(["settings"]);
	});

	test("⌘, is inert while an overlay is open, but ⌘K still toggles its own", () => {
		const actions = spy();
		expect(handleAppKey(keydown(","), actions, true)).toBe(false);
		expect(handleAppKey(keydown("k"), actions, true)).toBe(true);
		expect(actions.calls).toEqual(["palette"]);
	});

	test("a key without the modifier, and a handled event, are left alone", () => {
		const actions = spy();
		expect(handleAppKey(keydown("k", false), actions)).toBe(false);
		const handled = keydown("k");
		handled.preventDefault();
		expect(handleAppKey(handled, actions)).toBe(false);
		expect(actions.calls).toEqual([]);
	});
});

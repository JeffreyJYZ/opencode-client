import { afterEach, describe, expect, test } from "bun:test";
import { handleAppKey, installAppKeys, type KeymapActions } from "@/app/keymap";
import { chordLabel } from "@/constants/chords";
import { registerCommand, resetCommands } from "@/plugins/commands";

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
		onToggleSidebar: () => calls.push("sidebar"),
	};
}

/**
 * The window listeners a test installs, tracked so a failed assertion cannot leak
 * one into the next test (the listener lives on `window`, not the test's scope).
 */
const installed: Array<() => void> = [];
function install(): void {
	installed.push(installAppKeys(spy()));
}
afterEach(() => {
	for (const uninstall of installed.splice(0)) uninstall();
	resetCommands();
});

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

	test("⌘B toggles the sidebar and is consumed", () => {
		const actions = spy();
		expect(handleAppKey(keydown("b"), actions)).toBe(true);
		expect(actions.calls).toEqual(["sidebar"]);
	});

	test("⌘B is suppressed behind an overlay, like ⌘,", () => {
		const actions = spy();
		expect(handleAppKey(keydown("b"), actions, true)).toBe(false);
		expect(actions.calls).toEqual([]);
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

	test("a plugin chord fires while registered, and stops when disposed", () => {
		let ran = 0;
		const handle = registerCommand({
			id: "p.fire",
			title: "Fire",
			run: () => {
				ran += 1;
			},
			keybinding: chordLabel("E"),
		});
		install();
		window.dispatchEvent(keydown("e"));
		expect(ran).toBe(1);
		// The registration's lifetime is the chord's: disposing stops it firing.
		handle.dispose();
		window.dispatchEvent(keydown("e"));
		expect(ran).toBe(1);
	});

	test("a chord registered after the listener mounted still fires", () => {
		let ran = 0;
		install();
		registerCommand({
			id: "p.late",
			title: "Late",
			run: () => {
				ran += 1;
			},
			keybinding: chordLabel("E"),
		});
		window.dispatchEvent(keydown("e"));
		expect(ran).toBe(1);
	});

	test("a plugin chord is suppressed while an overlay is open, and fires after", () => {
		let ran = 0;
		registerCommand({
			id: "p.modal",
			title: "Modal",
			run: () => {
				ran += 1;
			},
			keybinding: chordLabel("E"),
		});
		const dialog = document.createElement("div");
		dialog.setAttribute("role", "dialog");
		document.body.append(dialog);
		install();
		window.dispatchEvent(keydown("e"));
		expect(ran).toBe(0);
		dialog.remove();
		window.dispatchEvent(keydown("e"));
		expect(ran).toBe(1);
	});
});

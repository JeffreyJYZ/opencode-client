import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chordLabel } from "@/constants/chords";
import { SHORTCUT_COMMAND_PALETTE, SHORTCUT_TOGGLE_SIDEBAR } from "@/constants/keys";
import { listCommands, registerCommand, resetCommands } from "@/plugins/commands";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";

/**
 * M4.19: a plugin command's `keybinding` is a **chord label**, and the registry
 * refuses — never lists, never shows — one it cannot bind: an unparseable label, or
 * one an app or plugin chord already claims. A chord that is shown must work.
 */

beforeEach(() => {
	resetCommands();
	clearFaults();
});
afterEach(resetCommands);

function lastFault() {
	return listFaults().at(-1);
}

describe("a keybound plugin command", () => {
	test("a valid chord registers and is listed with its keybinding", () => {
		const chord = chordLabel("E");
		const handle = registerCommand({
			id: "p.export",
			title: "Export",
			run: () => {},
			keybinding: chord,
		});
		expect(listFaults()).toHaveLength(0);
		expect(listCommands().map((command) => command.id)).toContain("p.export");
		expect(listCommands()[0]?.keybinding).toBe(chord);
		handle.dispose();
		expect(listCommands()).toHaveLength(0);
	});

	test("a chord colliding with an app chord is refused, and names the chord", () => {
		registerCommand({
			id: "p.k",
			title: "Steal the palette",
			run: () => {},
			keybinding: SHORTCUT_COMMAND_PALETTE.label,
		});
		expect(listCommands()).toHaveLength(0);
		expect(lastFault()?.area).toBe(FAULT_AREAS.commands);
		expect(lastFault()?.reason).toBe(FAULT_REASONS.chordConflict);
		expect(lastFault()?.message).toContain(SHORTCUT_COMMAND_PALETTE.label);
	});

	test("a second plugin chord on the same chord is refused too", () => {
		const chord = chordLabel("E");
		registerCommand({ id: "p.first", title: "First", run: () => {}, keybinding: chord });
		registerCommand({ id: "p.second", title: "Second", run: () => {}, keybinding: chord });
		expect(listCommands().map((command) => command.id)).toEqual(["p.first"]);
		expect(lastFault()?.reason).toBe(FAULT_REASONS.chordConflict);
		expect(lastFault()?.message).toContain(chord);
	});

	test("the app's own sidebar chord cannot be shadowed either", () => {
		registerCommand({
			id: "p.b",
			title: "Steal the sidebar",
			run: () => {},
			keybinding: SHORTCUT_TOGGLE_SIDEBAR.label,
		});
		expect(listCommands()).toHaveLength(0);
		expect(lastFault()?.reason).toBe(FAULT_REASONS.chordConflict);
	});

	test("an unparseable keybinding is refused, so nothing unbound is shown", () => {
		registerCommand({ id: "p.bad", title: "Bad", run: () => {}, keybinding: "mod+shift+e" });
		expect(listCommands()).toHaveLength(0);
		expect(lastFault()?.reason).toBe(FAULT_REASONS.malformedEntry);
		expect(lastFault()?.message).toContain("mod+shift+e");
	});

	test("a command with no keybinding is unaffected", () => {
		registerCommand({ id: "p.plain", title: "Plain", run: () => {} });
		expect(listCommands()).toHaveLength(1);
		expect(listFaults()).toHaveLength(0);
	});
});

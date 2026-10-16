import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ComponentType } from "react";
import { listCommands, registerCommand, resetCommands, runCommand } from "@/plugins/commands";
import type { Disposable } from "@/plugins/disposable";
import {
	clearFaults,
	FAULT_AREAS,
	FAULT_REASONS,
	type FaultArea,
	type FaultReason,
	listFaults,
} from "@/plugins/faults";
import { listPanels, registerPanel, resetPanels } from "@/plugins/panels";
import { listRenderers, registerRenderer, rendererFor, resetRenderers } from "@/plugins/renderers";

/**
 * The three M4.3 registries (commands, panels, renderers): a good contribution
 * registers, a bad one is inert plus one `PluginFault` in the registry's own area,
 * and nothing throws. The slot registry has its own files; routes, settings and
 * themes were built before this row and keep their tested storage.
 */

const component: ComponentType = () => null;
const open: Disposable[] = [];
const track = (disposable: Disposable): Disposable => {
	open.push(disposable);
	return disposable;
};

function expectFault(area: FaultArea, reason: FaultReason): string {
	const fault = listFaults().at(-1);
	expect(fault?.area).toBe(area);
	expect(fault?.reason).toBe(reason);
	return fault?.message ?? "";
}

beforeEach(() => {
	clearFaults();
});

afterEach(() => {
	for (const disposable of open.splice(0)) disposable.dispose();
	resetCommands();
	resetPanels();
	resetRenderers();
});

describe("commands", () => {
	test("registers, lists and runs; the handle removes it", () => {
		let ran = 0;
		const handle = track(registerCommand({ id: "m43-run", title: "Run", run: () => ran++ }));
		expect(listCommands().map((command) => command.id)).toEqual(["m43-run"]);
		expect(runCommand("m43-run")).toBe(true);
		expect(ran).toBe(1);
		handle.dispose();
		expect(listCommands()).toHaveLength(0);
	});

	test("refuses a malformed command and a duplicate, and unknown ids", () => {
		registerCommand({ id: "m43-dup", title: "t", run: () => {} });
		expect(typeof registerCommand({ id: "", title: "t", run: () => {} }).dispose).toBe(
			"function",
		);
		console.log(
			`[command empty id] ${expectFault(FAULT_AREAS.commands, FAULT_REASONS.malformedEntry)}`,
		);
		registerCommand({ id: "m43-notitle", title: "  ", run: () => {} });
		console.log(
			`[command empty title] ${expectFault(FAULT_AREAS.commands, FAULT_REASONS.malformedEntry)}`,
		);
		registerCommand({ id: "m43-norun", title: "t", run: 42 as unknown as () => void });
		console.log(
			`[command no run] ${expectFault(FAULT_AREAS.commands, FAULT_REASONS.malformedEntry)}`,
		);
		registerCommand({ id: "m43-dup", title: "t", run: () => {} });
		console.log(
			`[command duplicate] ${expectFault(FAULT_AREAS.commands, FAULT_REASONS.duplicateId)}`,
		);
		expect(listCommands().map((command) => command.id)).toEqual(["m43-dup"]);
		expect(runCommand("m43-nope")).toBe(false);
		console.log(
			`[command unknown id] ${expectFault(FAULT_AREAS.commands, FAULT_REASONS.unknownId)}`,
		);
	});
});

describe("panels", () => {
	test("registers a panel and refuses a malformed one", () => {
		track(registerPanel({ id: "m43-panel", title: "Panel", component }));
		expect(listPanels().map((panel) => panel.id)).toEqual(["m43-panel"]);
		registerPanel({ id: "m43-panel", title: "Panel", component });
		console.log(
			`[panel duplicate] ${expectFault(FAULT_AREAS.panels, FAULT_REASONS.duplicateId)}`,
		);
		registerPanel({ id: "m43-bad", title: "Panel", component: 7 as unknown as ComponentType });
		console.log(
			`[panel bad component] ${expectFault(FAULT_AREAS.panels, FAULT_REASONS.malformedEntry)}`,
		);
		expect(listPanels().map((panel) => panel.id)).toEqual(["m43-panel"]);
	});
});

describe("renderers", () => {
	test("an override is keyed by kind, so the later one is in force", () => {
		const first = track(registerRenderer({ id: "m43-r1", kind: "tool", component }));
		expect(rendererFor("tool")?.id).toBe("m43-r1");
		registerRenderer({ id: "m43-r2", kind: "tool", component });
		expect(rendererFor("tool")?.id).toBe("m43-r2");
		first.dispose();
		expect(rendererFor("tool")?.id).toBe("m43-r2");
		expect(listRenderers()).toHaveLength(1);
	});

	test("refuses an unknown kind and a malformed entry", () => {
		registerRenderer({ id: "m43-kind", kind: "nope", component });
		console.log(
			`[renderer unknown kind] ${expectFault(FAULT_AREAS.renderers, FAULT_REASONS.unknownKind)}`,
		);
		registerRenderer({ id: "", kind: "tool", component });
		console.log(
			`[renderer empty id] ${expectFault(FAULT_AREAS.renderers, FAULT_REASONS.malformedEntry)}`,
		);
		expect(rendererFor("nope")).toBeNull();
		expect(listRenderers()).toHaveLength(0);
	});
});

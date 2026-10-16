import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ComponentType } from "react";
import {
	clearFaults,
	FAULT_AREAS,
	FAULT_REASONS,
	type FaultArea,
	listFaults,
} from "@/plugins/faults";
import { createHostFactory } from "@/plugins/host";
import type { PluginInstance } from "@/plugins/instance";
import { getSlotContributions, register, SUBSTRATE } from "@/plugins/registry";

/**
 * The negative matrix through the **host** (M4.3): a plugin's bad contribution is
 * refused by the registry the host exposes, inert, one `PluginFault` in that
 * registry's area — never a throw into the plugin. The one registration path is
 * shown by a built-in and a plugin landing in the same slot collection.
 */

const component: ComponentType = () => null;
const instances: PluginInstance[] = [];

function makeHost(pluginId = "m43-plugin") {
	const { host, instance } = createHostFactory()(pluginId);
	instances.push(instance);
	return host;
}

function faultOf(area: FaultArea): string {
	const fault = listFaults().at(-1);
	expect(fault?.area).toBe(area);
	console.log(`[${area}] ${fault?.reason}: ${fault?.message}`);
	return fault?.message ?? "";
}

beforeEach(() => {
	clearFaults();
});

afterEach(() => {
	for (const instance of instances.splice(0)) instance.dispose();
});

describe("the slot registry through the host", () => {
	test("a plugin cannot contribute to a locked area", () => {
		const host = makeHost();
		host.ui.register({ id: "m43-locked", slot: "app.substrate", component });
		expect(getSlotContributions("app.substrate")).toHaveLength(0);
		expect(faultOf(FAULT_AREAS.slots)).toContain("locked");
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.lockedArea);
	});

	test("an unknown slot is inert", () => {
		const host = makeHost();
		host.ui.register({ id: "m43-unknown", slot: "m43.nope", component });
		expect(faultOf(FAULT_AREAS.slots)).toContain("m43.nope");
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.unknownSlot);
	});

	test("a built-in and a plugin land in the same collection", () => {
		const builtin = register({ id: "m43-builtin", slot: "home.hero", component }, SUBSTRATE);
		const host = makeHost();
		host.ui.register({ id: "m43-plugin", slot: "home.hero", component });
		expect(
			getSlotContributions("home.hero")
				.map((entry) => entry.id)
				.sort(),
		).toEqual(["m43-builtin", "m43-plugin"]);
		builtin.dispose();
	});
});

describe("the other registries through the host", () => {
	test("commands: a bad one is refused, an unknown id run faults", () => {
		const host = makeHost();
		host.commands.register({ id: "", title: "t", run: () => {} });
		expect(faultOf(FAULT_AREAS.commands)).toBeTruthy();
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.malformedEntry);
		expect(host.commands.run("m43-nope")).toBe(false);
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.unknownId);
	});

	test("panels and renderers: bad entries are refused", () => {
		const host = makeHost();
		host.panels.register({ id: "m43-p", title: "", component });
		expect(faultOf(FAULT_AREAS.panels)).toBeTruthy();
		host.renderers.register({ id: "m43-r", kind: "nope", component });
		expect(faultOf(FAULT_AREAS.renderers)).toBeTruthy();
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.unknownKind);
	});

	test("routes: a relative path is refused", () => {
		const host = makeHost();
		host.routes.register({ id: "m43-route", path: "relative", component });
		expect(faultOf(FAULT_AREAS.routes)).toBeTruthy();
	});

	test("settings: an empty title is refused", () => {
		const host = makeHost();
		host.settings.registerSection({ id: "m43-section", title: "", component });
		expect(faultOf(FAULT_AREAS.settings)).toBeTruthy();
	});

	test("themes: a malformed theme is refused with the inert handle", () => {
		const host = makeHost();
		const handle = host.themes.register({ id: "", mode: "dark", variables: {} } as never);
		expect(faultOf(FAULT_AREAS.themes)).toBeTruthy();
		expect(() => handle.dispose()).not.toThrow();
	});
});

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ComponentType } from "react";
import type { Disposable } from "@/plugins/disposable";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";
import { getSlotContributions, register, SUBSTRATE } from "@/plugins/registry";
import { isLockedSlot, LOCKED_SLOTS } from "@/plugins/slots";

/**
 * The lock (M4.3, spec 040 §Model): `app.substrate` and `app.builtins` accept a
 * contribution from the substrate and refuse one from a plugin — a check on the
 * `Actor`, not a convention. The substrate registers through the *same* function,
 * which is what proves the area is reachable and the refusal is about who asked.
 */

const component: ComponentType = () => null;
const plugin: { pluginId: string | null } = { pluginId: "m43-locked" };

const open: Disposable[] = [];
const track = (disposable: Disposable): Disposable => {
	open.push(disposable);
	return disposable;
};

beforeEach(() => {
	clearFaults();
});

afterEach(() => {
	for (const disposable of open.splice(0)) disposable.dispose();
});

describe("the locked areas", () => {
	test("the tuple names exactly the two locked slots", () => {
		expect(LOCKED_SLOTS).toEqual(["app.substrate", "app.builtins"]);
		expect(isLockedSlot("app.substrate")).toBe(true);
		expect(isLockedSlot("app.builtins")).toBe(true);
		expect(isLockedSlot("home.hero")).toBe(false);
	});

	test("a plugin is refused and nothing is listed", () => {
		for (const slot of LOCKED_SLOTS) {
			const refused = register({ id: `m43-${slot}`, slot, component }, plugin);
			expect(getSlotContributions(slot)).toHaveLength(0);
			const fault = listFaults().at(-1);
			expect(fault?.reason).toBe(FAULT_REASONS.lockedArea);
			expect(fault?.area).toBe(FAULT_AREAS.slots);
			console.log(`[locked ${slot}] ${fault?.message}`);
			expect(() => refused.dispose()).not.toThrow();
		}
	});

	test("the substrate registers into a locked area through the same function", () => {
		track(register({ id: "m43-substrate", slot: "app.substrate", component }, SUBSTRATE));
		expect(getSlotContributions("app.substrate").map((entry) => entry.id)).toEqual([
			"m43-substrate",
		]);
		expect(listFaults()).toHaveLength(0);
	});

	test("the default actor is the substrate", () => {
		track(register({ id: "m43-default-actor", slot: "app.builtins", component }));
		expect(getSlotContributions("app.builtins").map((entry) => entry.id)).toEqual([
			"m43-default-actor",
		]);
	});

	test("a plugin registers freely in an unlocked area", () => {
		track(register({ id: "m43-open", slot: "home.widgets", component }, plugin));
		expect(getSlotContributions("home.widgets").map((entry) => entry.id)).toEqual(["m43-open"]);
		expect(listFaults()).toHaveLength(0);
	});
});

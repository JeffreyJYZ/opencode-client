import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ComponentType } from "react";
import type { Disposable } from "@/plugins/disposable";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";
import {
	getSlotContributions,
	register,
	type SlotContribution,
	subscribeToRegistry,
} from "@/plugins/registry";
import type { SlotName } from "@/plugins/slots";

/** A slot from the tuple; which member it is does not matter to these tests. */
const TEST_SLOT: SlotName = "home.hero";

/** A name that is deliberately not in the tuple. */
const UNKNOWN_SLOT = "m04.not.a.slot";

const ids = () => getSlotContributions(TEST_SLOT).map((entry) => entry.id);

function makeComponent(text: string): ComponentType {
	return () => text;
}

const handle = makeComponent("m04");

/** Every handle a test opened, disposed after it, so no file leaks into the next. */
const open: Disposable[] = [];

function track(disposable: Disposable): Disposable {
	open.push(disposable);
	return disposable;
}

function lastFault(): ReturnType<typeof listFaults>[number] | undefined {
	return listFaults().at(-1);
}

beforeEach(() => {
	clearFaults();
});

afterEach(() => {
	for (const disposable of open.splice(0)) disposable.dispose();
});

describe("register", () => {
	test("registers a contribution and lists it for its slot", () => {
		track(register({ id: "m04-a", slot: TEST_SLOT, component: handle }));
		expect(ids()).toEqual(["m04-a"]);
	});

	test("orders by the key first, then by registration order", () => {
		track(register({ id: "m04-late", slot: TEST_SLOT, component: handle, order: 5 }));
		track(register({ id: "m04-first", slot: TEST_SLOT, component: handle, order: -1 }));
		track(register({ id: "m04-default", slot: TEST_SLOT, component: handle }));
		track(register({ id: "m04-second", slot: TEST_SLOT, component: handle, order: 5 }));
		expect(ids()).toEqual(["m04-first", "m04-default", "m04-late", "m04-second"]);
	});

	test("an empty slot is the same stable array on every read", () => {
		expect(getSlotContributions(TEST_SLOT)).toHaveLength(0);
		expect(getSlotContributions(TEST_SLOT)).toBe(getSlotContributions(TEST_SLOT));
	});

	test("refuses a duplicate id without throwing", () => {
		track(register({ id: "m04-dup", slot: TEST_SLOT, component: handle }));
		const refused = register({ id: "m04-dup", slot: TEST_SLOT, component: handle });
		expect(ids()).toEqual(["m04-dup"]);
		expect(lastFault()?.reason).toBe(FAULT_REASONS.duplicateId);
		expect(lastFault()?.area).toBe(FAULT_AREAS.slots);
		expect(lastFault()?.subject).toBe("m04-dup");
		expect(() => refused.dispose()).not.toThrow();
	});

	test("refuses an unknown slot without throwing", () => {
		let refused: Disposable | undefined;
		expect(() => {
			refused = register({ id: "m04-unknown", slot: UNKNOWN_SLOT, component: handle });
		}).not.toThrow();
		expect(lastFault()?.reason).toBe(FAULT_REASONS.unknownSlot);
		expect(lastFault()?.subject).toBe("m04-unknown");
		expect(refused).toBeDefined();
	});

	test("refuses a malformed entry without throwing", () => {
		const malformed = [
			{ id: "", slot: TEST_SLOT, component: handle },
			{
				id: "m04-empty",
				slot: TEST_SLOT,
				component: undefined,
			} as unknown as SlotContribution,
			{ id: "m04-nan", slot: TEST_SLOT, component: handle, order: Number.NaN },
		];
		for (const contribution of malformed) {
			expect(() => register(contribution)).not.toThrow();
			expect(lastFault()?.reason).toBe(FAULT_REASONS.malformedEntry);
		}
		expect(ids()).toEqual([]);
	});

	test("disposal removes exactly its own entry, and frees its id", () => {
		const first = track(register({ id: "m04-x", slot: TEST_SLOT, component: handle }));
		track(register({ id: "m04-y", slot: TEST_SLOT, component: handle }));
		first.dispose();
		first.dispose();
		expect(ids()).toEqual(["m04-y"]);
		track(register({ id: "m04-x", slot: TEST_SLOT, component: handle }));
		expect(ids()).toEqual(["m04-y", "m04-x"]);
	});

	test("notifies subscribers on registration and disposal", () => {
		let notifications = 0;
		const unsubscribe = subscribeToRegistry(() => notifications++);
		const disposable = track(register({ id: "m04-z", slot: TEST_SLOT, component: handle }));
		expect(notifications).toBe(1);
		disposable.dispose();
		expect(notifications).toBe(2);
		unsubscribe();
	});
});

describe("getSlotContributions", () => {
	test("refuses an unknown slot name once, however often it is read", () => {
		expect(getSlotContributions(UNKNOWN_SLOT)).toHaveLength(0);
		expect(getSlotContributions(UNKNOWN_SLOT)).toHaveLength(0);
		expect(getSlotContributions(UNKNOWN_SLOT)).toHaveLength(0);
		expect(listFaults().filter((fault) => fault.subject === UNKNOWN_SLOT)).toHaveLength(1);
	});
});

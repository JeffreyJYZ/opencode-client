import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ComponentType } from "react";
import type { Disposable } from "@/plugins/disposable";
import { clearFaults } from "@/plugins/faults";
import { getSlotContributions, register } from "@/plugins/registry";
import type { SlotName } from "@/plugins/slots";

/**
 * Replacement and disposal identity (M4.3). A registration under an id that is
 * already taken is refused, so replacement only happens after a slot is freed —
 * but a **stale** handle disposed after a fresh registration under the same id must
 * neither free the new id nor remove the new entry. The `ids` set and the
 * collection's identity check have to agree, or the new entry leaks (measured: it
 * did, and `Slot.test.tsx` caught it).
 */

const TEST_SLOT: SlotName = "statusline.left";
const component: ComponentType = () => null;

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

describe("a stale handle after a replacement", () => {
	test("disposing the old handle does not strand the new entry", () => {
		const stale = track(register({ id: "m43-repl", slot: TEST_SLOT, component }));
		stale.dispose();
		const fresh = track(register({ id: "m43-repl", slot: TEST_SLOT, component }));
		// The stale handle is disposed *after* the fresh registration took the id.
		stale.dispose();
		expect(getSlotContributions(TEST_SLOT).map((entry) => entry.id)).toEqual(["m43-repl"]);
		fresh.dispose();
		expect(getSlotContributions(TEST_SLOT)).toHaveLength(0);
	});

	test("the id is free again once the fresh entry is gone", () => {
		const first = track(register({ id: "m43-free", slot: TEST_SLOT, component }));
		first.dispose();
		const second = track(register({ id: "m43-free", slot: TEST_SLOT, component }));
		second.dispose();
		track(register({ id: "m43-free", slot: TEST_SLOT, component }));
		expect(getSlotContributions(TEST_SLOT).map((entry) => entry.id)).toEqual(["m43-free"]);
	});
});

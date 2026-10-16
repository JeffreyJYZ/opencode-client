import { beforeEach, describe, expect, test } from "bun:test";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";
import { createInstance } from "@/plugins/instance";

beforeEach(() => {
	clearFaults();
});

describe("a plugin instance", () => {
	test("disposes in the reverse of the order its handles arrived", () => {
		const order: string[] = [];
		const instance = createInstance("m42-order");
		for (const name of ["first", "second", "third"]) {
			instance.add({ dispose: () => order.push(name) });
		}
		instance.dispose();
		expect(order).toEqual(["third", "second", "first"]);
	});

	test("a throwing dispose is faulted and the rest still run", () => {
		const order: string[] = [];
		const instance = createInstance("m42-throw");
		instance.add({ dispose: () => order.push("a") });
		instance.add({
			dispose: () => {
				throw new Error("boom");
			},
		});
		instance.add({ dispose: () => order.push("c") });
		instance.dispose();
		expect(order).toEqual(["c", "a"]);
		const fault = listFaults().at(-1);
		expect(fault?.reason).toBe(FAULT_REASONS.disposeThrew);
		expect(fault?.area).toBe(FAULT_AREAS.plugins);
	});

	test("disposing twice runs nothing twice", () => {
		const order: string[] = [];
		const instance = createInstance("m42-twice");
		instance.add({ dispose: () => order.push("x") });
		instance.dispose();
		instance.dispose();
		expect(order).toEqual(["x"]);
	});
});

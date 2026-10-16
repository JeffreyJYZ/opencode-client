import { afterEach, describe, expect, test } from "bun:test";
import { compareByOrder, createCollection, NO_ORDER } from "@/plugins/collection";
import type { Disposable } from "@/plugins/disposable";

/**
 * The shared registry core (M4.3): order, identity-checked disposal, and the one
 * change notification. The registries built on it are tested on their own; this
 * file pins the behaviour they all inherit.
 */

type Row = { id: string; order?: number };

const open: Disposable[] = [];

function track(disposable: Disposable): Disposable {
	open.push(disposable);
	return disposable;
}

afterEach(() => {
	for (const disposable of open.splice(0)) disposable.dispose();
});

describe("compareByOrder", () => {
	test("a lower order sorts first and no order sorts last", () => {
		expect(compareByOrder({ order: 1 }, { order: 2 })).toBe(-1);
		expect(compareByOrder({ order: 2 }, { order: 1 })).toBe(1);
		expect(compareByOrder({ order: 1 }, { order: 1 })).toBe(0);
		expect(compareByOrder({}, { order: 999 })).toBe(1);
		expect(compareByOrder({ order: -999 }, {})).toBe(-1);
	});

	test("a non-entry and a non-numeric order are both NO_ORDER", () => {
		expect(NO_ORDER).toBe(Number.POSITIVE_INFINITY);
		expect(compareByOrder(null, {})).toBe(0);
		expect(compareByOrder("x", {})).toBe(0);
		expect(compareByOrder({ order: "5" }, {})).toBe(0);
	});
});

describe("a keyed collection", () => {
	test("sets, reads and lists by the default id key", () => {
		const collection = createCollection<Row>();
		track(collection.set({ id: "a" }));
		collection.set({ id: "b", order: 0 });
		expect(collection.has("a")).toBe(true);
		expect(collection.get("a")).toEqual({ id: "a" });
		expect(collection.keys()).toEqual(["a", "b"]);
		expect(collection.list().map((row) => row.id)).toEqual(["b", "a"]);
	});

	test("sorts by order, stable for equal orders, no order last", () => {
		const collection = createCollection<Row>();
		collection.set({ id: "late", order: 5 });
		collection.set({ id: "none" });
		collection.set({ id: "early", order: -1 });
		collection.set({ id: "tie", order: 5 });
		expect(collection.list().map((row) => row.id)).toEqual(["early", "late", "tie", "none"]);
	});

	test("keeps insertion order when not ordered", () => {
		const collection = createCollection<Row>({ ordered: false });
		collection.set({ id: "z", order: 1 });
		collection.set({ id: "a", order: 99 });
		expect(collection.list().map((row) => row.id)).toEqual(["z", "a"]);
	});

	test("a custom keyOf decides identity", () => {
		const collection = createCollection<Row>({ keyOf: (row) => row.order?.toString() ?? "?" });
		collection.set({ id: "first", order: 1 });
		collection.set({ id: "second", order: 1 });
		expect(collection.list().map((row) => row.id)).toEqual(["second"]);
	});

	test("the snapshot identity is stable until a change", () => {
		const collection = createCollection<Row>();
		const before = collection.list();
		expect(collection.list()).toBe(before);
		collection.set({ id: "a" });
		expect(collection.list()).not.toBe(before);
	});

	test("remove reports whether it took anything away", () => {
		const collection = createCollection<Row>();
		collection.set({ id: "a" });
		expect(collection.remove("a")).toBe(true);
		expect(collection.remove("a")).toBe(false);
		expect(collection.list()).toEqual([]);
	});

	test("replaceAll swaps the whole set with one change", () => {
		let changes = 0;
		const collection = createCollection<Row>({ onChange: () => changes++ });
		collection.set({ id: "a" });
		changes = 0;
		collection.replaceAll([{ id: "b" }, { id: "c" }]);
		expect(changes).toBe(1);
		expect(collection.keys()).toEqual(["b", "c"]);
	});
});

describe("the identity-checked disposer", () => {
	test("removes exactly the entry it was handed", () => {
		const collection = createCollection<Row>();
		const first = track(collection.set({ id: "x" }));
		collection.set({ id: "y" });
		first.dispose();
		expect(collection.list().map((row) => row.id)).toEqual(["y"]);
	});

	test("a later registration under the same key survives the old handle", () => {
		const collection = createCollection<Row>();
		const stale = track(collection.set({ id: "x" }));
		collection.set({ id: "x" });
		stale.dispose();
		expect(collection.list().map((row) => row.id)).toEqual(["x"]);
	});

	test("disposing twice removes nothing the second time", () => {
		const collection = createCollection<Row>();
		const first = track(collection.set({ id: "x" }));
		collection.set({ id: "y" });
		first.dispose();
		first.dispose();
		expect(collection.list().map((row) => row.id)).toEqual(["y"]);
	});
});

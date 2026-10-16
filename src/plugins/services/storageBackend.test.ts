import { describe, expect, test } from "bun:test";
import { createLocalStorageBackend } from "@/plugins/services/storageBackend";

/**
 * The persisted plugin-storage backend (M4.10): one `localStorage` row, read and
 * written whole. The tests use a map-backed `Storage` (the settings tests' own
 * fake) so nothing touches the run's real `localStorage`.
 */

/** A minimal `Storage`, enough for get/set/removeItem. */
function fakeStorage(initial: Record<string, string> = {}): Storage {
	const map = new Map(Object.entries(initial));
	return {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key) => map.get(key) ?? null,
		key: (index) => [...map.keys()][index] ?? null,
		removeItem: (key) => {
			map.delete(key);
		},
		setItem: (key, value) => {
			map.set(key, value);
		},
	} as Storage;
}

describe("createLocalStorageBackend", () => {
	test("a value written is read back and removed under one namespaced key", () => {
		const backend = createLocalStorageBackend(fakeStorage());
		backend.write("p::k", "v");
		expect(backend.read("p::k")).toBe("v");
		expect(backend.keys()).toEqual(["p::k"]);
		backend.remove("p::k");
		expect(backend.read("p::k")).toBeNull();
		expect(backend.keys()).toEqual([]);
	});

	test("two backends over one storage share the map, so a value survives a rebuild", () => {
		const storage = fakeStorage();
		createLocalStorageBackend(storage).write("p::k", "persisted");
		expect(createLocalStorageBackend(storage).read("p::k")).toBe("persisted");
	});

	test("unreadable stored text reads empty rather than throwing, and the next write replaces it", () => {
		const backend = createLocalStorageBackend(fakeStorage({ "plugins.storage": "{not json" }));
		expect(backend.read("p::k")).toBeNull();
		backend.write("p::k", "v");
		expect(backend.read("p::k")).toBe("v");
	});

	test("no storage at all is memory-only: it works in-process and persists nothing", () => {
		const backend = createLocalStorageBackend(null);
		backend.write("p::k", "v");
		expect(backend.read("p::k")).toBe("v");
		backend.remove("p::k");
		expect(backend.read("p::k")).toBeNull();
	});
});

import { beforeEach, describe, expect, test } from "bun:test";
import { PLUGIN_DATA_MAX_BYTES, PLUGIN_STORAGE_SEPARATOR } from "@/constants/plugins";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";
import {
	byteLength,
	createMemoryStorageBackend,
	createPluginStorage,
} from "@/plugins/services/storage";

/**
 * `storage` (M4.4, spec 040 §The host): a plugin's own capped key-value store. The
 * namespace is the host's, so two plugins naming one key write two rows and neither
 * can read the other's; a write that would cross the cap is refused, never trimmed.
 * A small `maxBytes` stands in for the real cap so the boundary is cheap to prove.
 */

const backend = createMemoryStorageBackend();
const a = createPluginStorage({ pluginId: "m44-a", backend });
const b = createPluginStorage({ pluginId: "m44-b", backend });

beforeEach(() => {
	clearFaults();
	for (const key of backend.keys()) backend.remove(key);
});

describe("the namespace", () => {
	test("round-trips a value and namespaces the backend key", async () => {
		await a.set("token", "secret");
		expect(await a.get("token")).toBe("secret");
		expect(backend.keys()).toEqual([`m44-a${PLUGIN_STORAGE_SEPARATOR}token`]);
	});

	test("a plugin cannot read another's key of the same name", async () => {
		await a.set("shared", "from-a");
		expect(await b.get("shared")).toBeNull();
		expect(await b.keys()).toEqual([]);
		await b.set("shared", "from-b");
		expect(await a.get("shared")).toBe("from-a");
		expect(await b.get("shared")).toBe("from-b");
	});

	test("keys() strips the host's prefix and lists only this plugin's", async () => {
		await a.set("one", "1");
		await a.set("two", "2");
		await b.set("three", "3");
		expect([...(await a.keys())].sort()).toEqual(["one", "two"]);
	});

	test("delete removes only the namespaced row", async () => {
		await a.set("gone", "x");
		await a.delete("gone");
		expect(await a.get("gone")).toBeNull();
		expect(await a.keys()).toEqual([]);
	});
});

describe("the key rule", () => {
	test("refuses an empty key, the separator, and any unsafe character", async () => {
		const bad = ["", "a/b", "a b", `a${PLUGIN_STORAGE_SEPARATOR}b`, "a\u0000b"];
		for (const key of bad) {
			await expect(a.set(key, "v")).rejects.toThrow();
			const fault = listFaults().at(-1);
			expect(fault?.area).toBe(FAULT_AREAS.storage);
			expect(fault?.reason).toBe(FAULT_REASONS.invalidKey);
			console.log(`[storage key ${JSON.stringify(key)}] ${fault?.message}`);
		}
		expect(await a.keys()).toEqual([]);
	});

	test("refuses a value that is not a string", async () => {
		await expect(a.set("k", 42 as unknown as string)).rejects.toThrow();
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.malformedEntry);
	});
});

describe("the cap", () => {
	const small = () => createPluginStorage({ pluginId: "m44-a", backend, maxBytes: 8 });

	test("a write at the boundary lands; one byte over is refused, not trimmed", async () => {
		const capped = small();
		await capped.set("k", "12345678");
		expect(byteLength("12345678")).toBe(8);
		await expect(capped.set("k", "123456789")).rejects.toThrow();
		const fault = listFaults().at(-1);
		expect(fault?.reason).toBe(FAULT_REASONS.storageOverCap);
		expect(fault?.subject).toBe("m44-a");
		console.log(`[storage over cap] ${fault?.message}`);
		expect(await capped.get("k")).toBe("12345678");
	});

	test("the cap counts the plugin's total, and a rewrite frees its old bytes", async () => {
		const capped = small();
		await capped.set("a", "1234");
		await capped.set("b", "1234");
		await expect(capped.set("c", "1")).rejects.toThrow();
		await capped.set("a", "1");
		await capped.set("c", "1");
		expect([...(await capped.keys())].sort()).toEqual(["a", "b", "c"]);
	});

	test("the default cap is the named constant", () => {
		expect(PLUGIN_DATA_MAX_BYTES).toBe(256 * 1024);
	});

	test("bytes, not characters: a multi-byte value counts its UTF-8 length", () => {
		expect(byteLength("é")).toBe(2);
		expect(byteLength("😀")).toBe(4);
	});
});

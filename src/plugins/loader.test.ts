import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { clearFaults, FAULT_REASONS } from "@/plugins/faults";
import {
	clearTrace,
	globals,
	installGlobals,
	lastFault,
	makeLoader,
	request,
	TRACE,
} from "@/test/plugins";

/**
 * The loader through its **real** path: a `Blob` and its object URL. Bun imports
 * a Blob URL, so the production mechanism is the one under test — no browser and
 * no injected importer stand in for it.
 */

beforeEach(() => {
	clearFaults();
	installGlobals();
});

afterEach(clearTrace);

describe("loading through the Blob path", () => {
	test("imports, runs setup, and disable clears the instance and its marker", async () => {
		const loader = makeLoader();
		const outcome = await loader.load(request("m41-hello", "hello"));
		expect(outcome.status).toBe("loaded");
		expect(outcome.id).toBe("m41-hello");
		expect(outcome.warnings).toEqual([]);
		expect(loader.list()).toEqual(["m41-hello"]);
		expect(globals[TRACE.imported]).toBe(true);
		expect(globals[TRACE.marker]).toBe("m41-hello:hello");
		expect(loader.disable("m41-hello")).toBe(true);
		expect(loader.list()).toEqual([]);
		expect(globals[TRACE.marker]).toBeUndefined();
		expect(loader.disable("m41-hello")).toBe(false);
	});

	test("off by default imports nothing at all", async () => {
		const loader = makeLoader(() => false);
		const outcome = await loader.load(request("m41-off", "off"));
		expect(outcome).toEqual({ status: "off", id: null, warnings: [] });
		expect(globals[TRACE.imported]).toBeUndefined();
		expect(loader.list()).toEqual([]);
	});
});

describe("a two-phase reload", () => {
	test("disposes the old instance only after the new source validated", async () => {
		const loader = makeLoader();
		await loader.load(request("m41-reload", "old"));
		globals[TRACE.order] = [];
		const outcome = await loader.reload(request("m41-reload", "new"));
		expect(outcome.status).toBe("loaded");
		expect(globals[TRACE.order]).toEqual(["new:import", "old:dispose", "new:setup"]);
		expect(globals[TRACE.marker]).toBe("m41-reload:new");
	});

	test("keeps the old instance running when the new manifest is refused", async () => {
		const loader = makeLoader();
		await loader.load(request("m41-keep", "old"));
		globals[TRACE.order] = [];
		const outcome = await loader.reload(request("m41-keep", "new", { apiVersion: "2.0" }));
		expect(outcome.status).toBe("refused");
		expect(globals[TRACE.order]).toEqual([]);
		expect(loader.list()).toEqual(["m41-keep"]);
		expect(globals[TRACE.marker]).toBe("m41-keep:old");
		expect(lastFault()?.reason).toBe(FAULT_REASONS.unsupportedApiVersion);
	});
});

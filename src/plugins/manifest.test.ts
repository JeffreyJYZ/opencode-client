import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { FAULT_REASONS } from "@/plugins/faults";
import { isPluginId, manifestSchema, PLUGIN_ID_PATTERN, parseManifest } from "@/plugins/manifest";

/**
 * The corpus is the contract both languages implement (spec 040 §Manifest): the
 * TS half validates it here, the Rust half in `src-tauri/src/tests.rs`. Changing
 * either side's rule without the corpus fails that side's own test — the drift
 * guard the brief asks for, across `bun test` and `cargo test`.
 */
const CORPUS = JSON.parse(
	readFileSync(new URL("./plugin-id-cases.json", import.meta.url), "utf8"),
) as { pattern: string; cases: Array<{ id: string; valid: boolean }> };

const VALID = {
	id: "m41-plugin",
	name: "M41",
	version: "1.0.0",
	apiVersion: "0.1",
	engines: { app: "*" },
};

describe("the id pattern", () => {
	test("is the one the shared corpus names", () => {
		expect(PLUGIN_ID_PATTERN.source).toBe(CORPUS.pattern);
	});

	test("agrees with every corpus case", () => {
		expect(CORPUS.cases.length).toBeGreaterThan(0);
		for (const { id, valid } of CORPUS.cases) expect(isPluginId(id)).toBe(valid);
	});
});

describe("parseManifest", () => {
	test("accepts a valid manifest with no warning at the host's own minor", () => {
		const result = parseManifest(VALID, "0.1.0");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.warnings).toEqual([]);
	});

	test("warns, but loads, for a different apiVersion minor (spec 040)", () => {
		const result = parseManifest({ ...VALID, apiVersion: "0.9" }, "0.1.0");
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.warnings).toHaveLength(1);
	});

	test("refuses a different apiVersion major", () => {
		const result = parseManifest({ ...VALID, apiVersion: "2.0" }, "0.1.0");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.problem.reason).toBe(FAULT_REASONS.unsupportedApiVersion);
	});

	test("refuses a bad id, an unknown capability, a missing app and an unmet range", () => {
		const badId = parseManifest({ ...VALID, id: "BAD.." }, "0.1.0");
		const badCapability = parseManifest(
			{ ...VALID, capabilities: ["window", "root"] },
			"0.1.0",
		);
		const noEngines = parseManifest(
			{ id: "m41", name: "n", version: "1", apiVersion: "0.1" },
			"0.1.0",
		);
		const unmet = parseManifest({ ...VALID, engines: { app: ">=9.0.0" } }, "0.1.0");
		expect(badId.ok).toBe(false);
		expect(badCapability.ok).toBe(false);
		expect(noEngines.ok).toBe(false);
		expect(unmet.ok).toBe(false);
		if (!badId.ok) expect(badId.problem.reason).toBe(FAULT_REASONS.invalidId);
		if (!badCapability.ok)
			expect(badCapability.problem.reason).toBe(FAULT_REASONS.unknownCapability);
		if (!noEngines.ok) expect(noEngines.problem.reason).toBe(FAULT_REASONS.enginesApp);
		if (!unmet.ok) expect(unmet.problem.reason).toBe(FAULT_REASONS.enginesApp);
	});

	test("refuses a value that is not an object", () => {
		const result = parseManifest("not a manifest", "0.1.0");
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.problem.reason).toBe(FAULT_REASONS.invalidManifest);
	});

	test("the schema refuses a bare id and a missing name", () => {
		expect(manifestSchema.safeParse({ ...VALID, id: ".hidden" }).success).toBe(false);
		expect(manifestSchema.safeParse({ ...VALID, name: "" }).success).toBe(false);
	});
});

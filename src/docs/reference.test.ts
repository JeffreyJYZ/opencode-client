import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GENERATOR_TIMEOUT_MS } from "@/test/budget";

/**
 * The in-app API reference's drift gate (M4.8, spec 040 §Build, install, develop).
 *
 * A generated page is only worth its generator if it cannot be stale: the first
 * test runs `scripts/generate-reference.ts` into a temp path and diffs it against
 * the committed module, so a slot renamed in `slots.ts`, a member added to `Host`
 * or a new capability fails here until the file is regenerated. The second asserts
 * the committed data covers the code — every slot, every locked flag, every `Host`
 * member — without a second hand-typed list to keep in step.
 */

const GENERATOR = "scripts/generate-reference.ts";
const COMMITTED = "src/docs/reference.generated.ts";

describe("the generated API reference", () => {
	test(
		"matches a fresh run of its generator",
		() => {
			const dir = mkdtempSync(join(tmpdir(), "oc-reference-"));
			try {
				const out = join(dir, "reference.generated.ts");
				const run = Bun.spawnSync({
					cmd: ["bun", GENERATOR, "--out", out],
					stdout: "pipe",
					stderr: "pipe",
				});
				expect(run.exitCode, run.stderr.toString()).toBe(0);
				expect(readFileSync(out, "utf8")).toBe(readFileSync(COMMITTED, "utf8"));
			} finally {
				rmSync(dir, { recursive: true, force: true });
			}
		},
		// The generator's own work, not a wait: see `GENERATOR_TIMEOUT_MS`.
		GENERATOR_TIMEOUT_MS,
	);

	test("names every slot and every Host member the code declares", async () => {
		const { REFERENCE } = await import("@/docs/reference.generated");
		const { SLOTS, isLockedSlot } = await import("@/plugins/slots");
		expect(REFERENCE.slots.map((slot) => slot.name).sort()).toEqual([...SLOTS].sort());
		for (const slot of REFERENCE.slots) expect(slot.locked).toBe(isLockedSlot(slot.name));
		const members = REFERENCE.host.map((member) => member.name);
		expect(new Set(members).size).toBe(members.length);
		expect(REFERENCE.registries.length + REFERENCE.services.length).toBe(members.length);
		expect(REFERENCE.registries.length).toBeGreaterThan(0);
		expect(REFERENCE.services.length).toBeGreaterThan(0);
	});
});

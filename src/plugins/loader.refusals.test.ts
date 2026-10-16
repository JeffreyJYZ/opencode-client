import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { HOST_GLOBAL } from "@/constants/plugins";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, type FaultReason } from "@/plugins/faults";
import {
	clearTrace,
	globals,
	installGlobals,
	lastFault,
	makeLoader,
	manifest,
	request,
	source,
} from "@/test/plugins";

/**
 * The negative matrix (M4.1/M4.2): every refusal is inert and recorded as a
 * `PluginFault` whose text names the reason. The messages are printed so a run's
 * own output carries the matrix, rather than a description of it.
 */

beforeEach(() => {
	clearFaults();
	installGlobals();
});

afterEach(clearTrace);

describe("the negative matrix", () => {
	test("refuses each bad manifest with its own PluginFault", async () => {
		const loader = makeLoader();
		const rows: Array<{
			name: string;
			manifest: Record<string, unknown>;
			reason: FaultReason;
		}> = [
			{ name: "bad id", manifest: manifest("BAD.."), reason: FAULT_REASONS.invalidId },
			{
				name: "unknown capability",
				manifest: manifest("m41-cap", { capabilities: ["window", "root"] }),
				reason: FAULT_REASONS.unknownCapability,
			},
			{
				name: "wrong apiVersion major",
				manifest: manifest("m41-api", { apiVersion: "1.0" }),
				reason: FAULT_REASONS.unsupportedApiVersion,
			},
			{
				name: "missing engines.app",
				manifest: { id: "m41-engine", name: "n", version: "1", apiVersion: "0.1" },
				reason: FAULT_REASONS.enginesApp,
			},
		];
		for (const row of rows) {
			const outcome = await loader.load({ manifest: row.manifest, source: source("x", "x") });
			expect(outcome.status).toBe("refused");
			const fault = lastFault();
			expect(fault?.reason).toBe(row.reason);
			expect(fault?.area).toBe(FAULT_AREAS.plugins);
			console.log(`[${row.name}] ${fault?.reason}: ${fault?.message}`);
		}
		expect(loader.list()).toEqual([]);
	});

	test("refuses a bundle with a surviving bare specifier", async () => {
		const loader = makeLoader();
		const bare = 'import x from "m41-not-a-real-module"; export default { setup() {} };';
		const outcome = await loader.load({ manifest: manifest("m41-bare"), source: bare });
		expect(outcome.status).toBe("refused");
		expect(lastFault()?.reason).toBe(FAULT_REASONS.bareSpecifier);
		console.log(`[bare specifier] ${lastFault()?.message}`);
	});

	test("refuses an entry that imported without the host globals", async () => {
		const loader = makeLoader();
		delete globals[HOST_GLOBAL.react];
		const outcome = await loader.load(request("m41-globals", "g"));
		expect(outcome.status).toBe("refused");
		expect(lastFault()?.reason).toBe(FAULT_REASONS.missingGlobals);
		console.log(`[missing globals] ${lastFault()?.message}`);
	});

	test("refuses an entry with no setup and one whose setup throws", async () => {
		const loader = makeLoader();
		const noSetup = await loader.load({
			manifest: manifest("m41-nosetup"),
			source: "export default {};",
		});
		expect(noSetup.status).toBe("refused");
		expect(lastFault()?.reason).toBe(FAULT_REASONS.noSetup);
		const threw = await loader.load({
			manifest: manifest("m41-threw"),
			source: 'export default { setup() { throw new Error("boom"); } };',
		});
		expect(threw.status).toBe("refused");
		expect(lastFault()?.reason).toBe(FAULT_REASONS.setupThrew);
		expect(loader.list()).toEqual([]);
	});
});

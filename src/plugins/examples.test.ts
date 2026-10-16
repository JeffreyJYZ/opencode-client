import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { updateSettings } from "@/app/settings/store";
import { runCommand } from "@/plugins/commands";
import { listFaults } from "@/plugins/faults";
import { listLogs } from "@/plugins/logs";
import { disablePlugin, enablePlugin, installPlugin, uninstallPlugin } from "@/plugins/manager";
import {
	builtSource,
	contributionDelta,
	counts,
	EXAMPLES,
	EXPECTED,
	manifestOf,
	NOTHING,
} from "@/test/examplePlugins";

/**
 * The four example plugins, end to end (M4.7, spec 040 §Plugins shipped as
 * examples): each one is **built by `scripts/build-plugins.ts`**, installed from
 * its built entry, enabled through the manager's one loader — the production path,
 * a `Blob` import — then disabled and uninstalled, with its contributions counted
 * before and after every step. `src/test/examplePlugins.ts` holds the fixture.
 *
 * The fault assertions are **deltas**, not "no faults at all": `bun test` runs every
 * file in one process, so a sibling file's refused contribution is already in the
 * store when this one starts. What this file proves is that *these* plugins add
 * none — and `afterEach` disposes them even when an assertion throws, so a failure
 * here cannot leak a command or a panel into the file that runs next.
 */

const faultsNow = (): number => listFaults().length;

beforeAll(() => {
	const built = Bun.spawnSync({
		cmd: ["bun", "scripts/build-plugins.ts", ...EXAMPLES],
		stdout: "pipe",
		stderr: "pipe",
	});
	expect(built.exitCode, built.stderr.toString()).toBe(0);
});

beforeEach(() => {
	// The master switch is off by default (spec 040 §Model); the examples exercise
	// the loader, so it is on and each plugin's own `enabled` flag gates it.
	updateSettings({ pluginsEnabled: true });
});

afterEach(() => {
	for (const id of EXAMPLES) {
		disablePlugin(id);
		uninstallPlugin(id);
	}
	updateSettings({ pluginsEnabled: false });
});

describe("the example plugins", () => {
	for (const id of EXAMPLES) {
		test(`${id} installs, contributes exactly what it claims, and leaves nothing behind`, async () => {
			const expected = EXPECTED[id];
			expect(manifestOf(id).capabilities ?? []).toEqual(expected.capabilities);
			const faults = faultsNow();

			const before = counts();
			expect(installPlugin(manifestOf(id), builtSource(id)).ok).toBe(true);
			// Installed is not loaded: nothing is contributed until it is enabled.
			expect(contributionDelta(before, counts())).toEqual(NOTHING);

			const loaded = await enablePlugin(id);
			expect(loaded?.status, JSON.stringify(loaded)).toBe("loaded");
			expect(contributionDelta(before, counts())).toEqual({
				slot: expected.slot,
				command: expected.command,
				panel: expected.panel,
				theme: expected.theme,
				section: expected.section,
			});
			expect(faultsNow()).toBe(faults);

			expect(disablePlugin(id)).toBe(true);
			// The loader's one LIFO disposal retracted every contribution.
			expect(counts()).toEqual(before);
			expect(faultsNow()).toBe(faults);

			uninstallPlugin(id);
			expect(counts()).toEqual(before);
			expect(faultsNow()).toBe(faults);
		});
	}

	test("hello-world's dispose clears the document marker it set", async () => {
		expect(installPlugin(manifestOf("hello-world"), builtSource("hello-world")).ok).toBe(true);
		await enablePlugin("hello-world");
		expect(document.documentElement.getAttribute("data-hello-world")).toBe("on");
		expect(runCommand("hello-world.greet")).toBe(true);
		disablePlugin("hello-world");
		expect(document.documentElement.hasAttribute("data-hello-world")).toBe(false);
		uninstallPlugin("hello-world");
	});

	test("session-export's command reads the transcript and writes its own store", async () => {
		const id = "session-export";
		const faults = faultsNow();
		expect(installPlugin(manifestOf(id), builtSource(id)).ok).toBe(true);
		await enablePlugin(id);
		expect(runCommand("session-export.export")).toBe(true);
		// The command's work is async (storage returns promises); give it its turn.
		await Bun.sleep(10);
		const lines = listLogs().filter((entry) => entry.pluginId === id);
		expect(lines.at(-1)?.message).toStartWith("exported ");
		// No filesystem in this build (`native === null`) and the store write was
		// refused by nothing: the plugin added no fault.
		expect(faultsNow()).toBe(faults);
		disablePlugin(id);
		uninstallPlugin(id);
	});
});

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getSettingsSections } from "@/app/settings/sections";
import { listCommands } from "@/plugins/commands";
import { clearFaults, listFaults } from "@/plugins/faults";
import type { Loader, PluginRequest } from "@/plugins/loader";
import { listLogs } from "@/plugins/logs";
import { listPanels } from "@/plugins/panels";
import { getSlotContributions } from "@/plugins/registry";
import { makeLoader, manifest } from "@/test/plugins";

/**
 * The positive pass (M4.3/M4.4): one throwaway plugin, loaded through the real
 * Blob path, uses several services and contributes to four registries; disabling
 * it leaves **no** contribution behind — the counts return to what they were, and
 * the host's own signal is aborted last.
 */

const globals = globalThis as unknown as Record<string, unknown>;

const SOURCE = `
export default { setup(host) {
	globalThis.__m44Host = host;
	globalThis.__m44 = { api: host.version.api, client: host.opencode.client, native: host.native };
	host.log.info("m44 positive pass");
	host.notify.toast("m44");
	host.ui.register({ id: "m44-slot", slot: "home.hero", component: () => null });
	host.commands.register({ id: "m44-cmd", title: "M44", run: () => {} });
	host.panels.register({ id: "m44-panel", title: "M44", component: () => null });
	host.settings.registerSection({ id: "m44-section", title: "M44", component: () => null });
	return { dispose() { globalThis.__m44Disposed = true; } };
} };
`;

function request(): PluginRequest {
	return { manifest: manifest("m44-positive"), source: SOURCE };
}

const counts = () => ({
	slots: getSlotContributions("home.hero").length,
	commands: listCommands().length,
	panels: listPanels().length,
	sections: getSettingsSections().filter((section) => section.id === "m44-section").length,
});

let loader: Loader;

beforeEach(() => {
	clearFaults();
	for (const key of Object.keys(globals)) {
		if (key.startsWith("__m44")) delete globals[key];
	}
	loader = makeLoader();
});

afterEach(() => {
	loader.disable("m44-positive");
});

describe("a plugin that uses the host and several registries", () => {
	test("registers everywhere, then disable leaves nothing behind", async () => {
		const before = counts();
		expect(before).toEqual({ slots: 0, commands: 0, panels: 0, sections: 0 });

		const outcome = await loader.load(request());
		expect(outcome.status).toBe("loaded");
		expect(outcome.id).toBe("m44-positive");
		expect(listFaults()).toHaveLength(0);

		const during = counts();
		console.log(
			`[positive pass] counts ${JSON.stringify(before)} -> ${JSON.stringify(during)}`,
		);
		expect(during).toEqual({ slots: 1, commands: 1, panels: 1, sections: 1 });
		expect(globals.__m44).toEqual({ api: "0.1", client: null, native: null });
		expect(listLogs().at(-1)?.pluginId).toBe("m44-positive");

		expect(loader.disable("m44-positive")).toBe(true);
		expect(globals.__m44Disposed).toBe(true);
		expect(counts()).toEqual(before);
		expect(loader.list()).toEqual([]);
		const host = globals.__m44Host as { signal: AbortSignal };
		expect(host.signal.aborted).toBe(true);
		console.log(`[positive pass] after disable ${JSON.stringify(counts())}`);
	});
});

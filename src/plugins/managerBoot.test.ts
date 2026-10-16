import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetSettings, updateSettings } from "@/app/settings/store";
import { PLUGIN_INSTALLED_KEY } from "@/constants/pluginManager";
import { resetAppPorts, setAppPorts } from "@/plugins/appPorts";
import { clearFaults } from "@/plugins/faults";
import { resetInstalled, setPluginEnabled } from "@/plugins/installed";
import { getPluginsSnapshot, installPlugin, loader } from "@/plugins/manager";
import { startPluginManager } from "@/plugins/managerBoot";

/**
 * The manager's boot (M4.10): hydrate the installed store from storage, then load
 * the enabled plugins only once the app's ports exist and only while the master
 * switch is on. The loader is the production one (a `Blob` import), and the storage
 * is happy-dom's real `localStorage` (the test preload registers it), so the
 * "reload" is observable: the in-memory record store is emptied while the stored
 * row survives.
 */

const ID = "probe-boot";

const MANIFEST = {
	id: ID,
	name: "Probe Boot",
	version: "1.0.0",
	apiVersion: "0.1",
	engines: { app: "*" },
	capabilities: [],
};

const SOURCE = `export default { setup() { (globalThis.__boot = globalThis.__boot ?? []).push("setup"); return { dispose() {} }; } };`;

beforeEach(() => {
	resetInstalled();
	resetAppPorts();
	resetSettings();
});

afterEach(() => {
	loader.disable(ID);
	resetInstalled();
	resetAppPorts();
	resetSettings();
	clearFaults();
});

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
	const start = Date.now();
	while (!predicate()) {
		if (Date.now() - start > timeoutMs) throw new Error("waitFor timed out");
		await new Promise((resolve) => setTimeout(resolve, 5));
	}
}

describe("the manager's boot", () => {
	test("hydrates the installed store from storage, so a reload still lists the plugin", () => {
		updateSettings({ pluginsEnabled: true });
		installPlugin(MANIFEST, SOURCE);
		// The record is on disk; empty the in-memory store the way a fresh process would.
		const stored = localStorage.getItem(PLUGIN_INSTALLED_KEY);
		if (stored === null) throw new Error("nothing was persisted");
		resetInstalled();
		localStorage.setItem(PLUGIN_INSTALLED_KEY, stored);
		expect(getPluginsSnapshot().installed).toHaveLength(0);

		startPluginManager();
		expect(getPluginsSnapshot().installed.map((plugin) => plugin.manifest.id)).toEqual([ID]);
	});

	test("loads an enabled plugin when the app publishes its ports", async () => {
		updateSettings({ pluginsEnabled: true });
		installPlugin(MANIFEST, SOURCE);
		startPluginManager();
		setPluginEnabled(ID, true);

		setAppPorts({ client: null });
		await waitFor(() => loader.list().includes(ID));
		expect(getPluginsSnapshot().loaded).toContain(ID);
	});

	test("with the master switch off nothing loads, even an enabled plugin", async () => {
		installPlugin(MANIFEST, SOURCE);
		startPluginManager();
		setPluginEnabled(ID, true);

		setAppPorts({ client: null });
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(loader.list()).not.toContain(ID);
	});

	test("with the switch on but the plugin disabled, still nothing loads", async () => {
		updateSettings({ pluginsEnabled: true });
		installPlugin(MANIFEST, SOURCE);
		startPluginManager();

		setAppPorts({ client: null });
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(loader.list()).not.toContain(ID);
	});

	test("turning the switch on loads the plugins already enabled", async () => {
		installPlugin(MANIFEST, SOURCE);
		setPluginEnabled(ID, true);
		startPluginManager();
		setAppPorts({ client: null });
		await new Promise((resolve) => setTimeout(resolve, 30));
		expect(loader.list()).not.toContain(ID);

		updateSettings({ pluginsEnabled: true });
		await waitFor(() => loader.list().includes(ID));
		expect(getPluginsSnapshot().loaded).toContain(ID);
	});
});

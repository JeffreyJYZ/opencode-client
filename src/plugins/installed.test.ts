import { afterEach, describe, expect, test } from "bun:test";
import { PLUGIN_INSTALLED_KEY } from "@/constants/pluginManager";
import { clearFaults, FAULT_REASONS, listFaults } from "@/plugins/faults";
import {
	getInstalled,
	hydrateInstalled,
	installPlugin,
	listInstalled,
	resetInstalled,
	setPluginEnabled,
} from "@/plugins/installed";

/**
 * The installed-plugin store (M4.5): a manifest is validated **at install**, the
 * record starts disabled, and the persisted blob is read back defensively.
 */

const MANIFEST = {
	id: "probe-installed",
	name: "Probe",
	version: "1.0.0",
	apiVersion: "0.1",
	engines: { app: "*" },
	capabilities: ["plugin-data", "net"],
};

afterEach(() => {
	resetInstalled();
	clearFaults();
	localStorage.clear();
});

describe("installPlugin", () => {
	test("stores the validated manifest, disabled, and persists it", () => {
		expect(installPlugin(MANIFEST, "export default { setup() {} };")).toEqual({
			ok: true,
			id: "probe-installed",
		});
		const record = getInstalled("probe-installed");
		expect(record?.enabled).toBe(false);
		expect(record?.manifest.capabilities).toEqual(["plugin-data", "net"]);
		const stored = JSON.parse(localStorage.getItem(PLUGIN_INSTALLED_KEY) ?? "[]");
		expect(stored).toHaveLength(1);
	});

	test("an unknown capability is refused at install and recorded", () => {
		const outcome = installPlugin({ ...MANIFEST, capabilities: ["teleport"] }, "source");
		expect(outcome.ok).toBe(false);
		expect(listInstalled()).toHaveLength(0);
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.unknownCapability);
	});

	test("a manifest with no engines.app is refused", () => {
		const { engines: _engines, ...rest } = MANIFEST;
		expect(installPlugin(rest, "source").ok).toBe(false);
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.enginesApp);
	});

	test("an empty entry source is refused and nothing is stored", () => {
		expect(installPlugin(MANIFEST, "   ").ok).toBe(false);
		expect(listInstalled()).toHaveLength(0);
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.malformedEntry);
	});

	test("the enabled flag round-trips through the store", () => {
		installPlugin(MANIFEST, "source");
		setPluginEnabled("probe-installed", true);
		expect(getInstalled("probe-installed")?.enabled).toBe(true);
		setPluginEnabled("probe-installed", true);
		expect(listInstalled()).toHaveLength(1);
	});
});

describe("hydrateInstalled", () => {
	test("reads back what a previous session persisted", () => {
		localStorage.setItem(
			PLUGIN_INSTALLED_KEY,
			JSON.stringify([{ manifest: MANIFEST, source: "src", enabled: true }]),
		);
		hydrateInstalled();
		expect(getInstalled("probe-installed")?.enabled).toBe(true);
	});

	test("drops a record whose manifest does not validate", () => {
		localStorage.setItem(
			PLUGIN_INSTALLED_KEY,
			JSON.stringify([{ manifest: { id: "not-a-plugin" }, source: "src", enabled: true }]),
		);
		hydrateInstalled();
		expect(listInstalled()).toHaveLength(0);
	});

	test("unreadable text leaves the store empty rather than throwing", () => {
		localStorage.setItem(PLUGIN_INSTALLED_KEY, "not json");
		hydrateInstalled();
		expect(listInstalled()).toHaveLength(0);
	});
});

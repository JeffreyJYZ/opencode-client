import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";
import { getInstalled, resetInstalled } from "@/plugins/installed";
import { clearLogs, listLogs } from "@/plugins/logs";
import {
	disablePlugin,
	enablePlugin,
	getPluginsSnapshot,
	installPlugin,
	reloadPlugin,
	uninstallPlugin,
} from "@/plugins/manager";
import { getSlotContributions } from "@/plugins/registry";

/**
 * The manager (M4.5) through the loader's **real** path: the source is imported
 * from a `Blob`, so a row's state, its contributions and its disposer are the
 * production mechanism's, not a stand-in's.
 */

const TRACE = "__m45ManagerTrace";
const globals = globalThis as unknown as Record<string, unknown>;

const MANIFEST = {
	id: "probe-manager",
	name: "Probe Manager",
	version: "2.0.0",
	apiVersion: "0.1",
	engines: { app: "*" },
	capabilities: ["plugin-data"],
};

const SOURCE = `
export default { setup(host) {
	(globalThis.${TRACE} = globalThis.${TRACE} ?? []).push("setup");
	host.ui.register({ id: "probe-manager.marker", slot: "topnav.right", component: () => null });
	return { dispose() { globalThis.${TRACE}.push("dispose"); } };
} };
`;

const BARE = `import "left-pad";\nexport default { setup() {} };`;

const trace = (): readonly string[] => (globals[TRACE] as string[] | undefined) ?? [];
const marker = (): boolean =>
	getSlotContributions("topnav.right").some((entry) => entry.id === "probe-manager.marker");

beforeEach(() => {
	globals[TRACE] = [];
	clearFaults();
	clearLogs();
	resetInstalled();
});

afterEach(() => {
	disablePlugin("probe-manager");
	resetInstalled();
	clearFaults();
});

describe("the four actions", () => {
	test("enable loads through the loader and disable retracts the contribution and runs dispose", async () => {
		installPlugin(MANIFEST, SOURCE);
		const outcome = await enablePlugin("probe-manager");
		expect(outcome?.status).toBe("loaded");
		expect(getPluginsSnapshot().loaded).toContain("probe-manager");
		expect(getInstalled("probe-manager")?.enabled).toBe(true);
		expect(marker()).toBe(true);
		expect(disablePlugin("probe-manager")).toBe(true);
		expect(marker()).toBe(false);
		expect(getInstalled("probe-manager")?.enabled).toBe(false);
		expect(trace()).toEqual(["setup", "dispose"]);
	});

	test("reload is the two-phase path: dispose, then setup again", async () => {
		installPlugin(MANIFEST, SOURCE);
		await enablePlugin("probe-manager");
		const outcome = await reloadPlugin("probe-manager");
		expect(outcome?.status).toBe("loaded");
		expect(trace()).toEqual(["setup", "dispose", "setup"]);
		expect(marker()).toBe(true);
	});

	test("uninstall removes the record, the contribution and its faults", async () => {
		installPlugin(MANIFEST, SOURCE);
		await enablePlugin("probe-manager");
		uninstallPlugin("probe-manager");
		expect(getInstalled("probe-manager")).toBeNull();
		expect(getPluginsSnapshot().installed).toHaveLength(0);
		expect(marker()).toBe(false);
	});

	test("disable is false when nothing ran under that id", () => {
		expect(disablePlugin("probe-manager")).toBe(false);
	});

	test("reload and enable are null for an id nobody installed", async () => {
		expect(await enablePlugin("ghost")).toBeNull();
		expect(await reloadPlugin("ghost")).toBeNull();
	});
});

describe("a plugin that cannot load", () => {
	test("a surviving bare specifier is refused with its recorded fault text", async () => {
		installPlugin(MANIFEST, BARE);
		const outcome = await enablePlugin("probe-manager");
		expect(outcome?.status).toBe("refused");
		const fault = listFaults().at(-1);
		expect(fault?.area).toBe(FAULT_AREAS.plugins);
		expect(fault?.reason).toBe(FAULT_REASONS.bareSpecifier);
		expect(fault?.subject).toBe("probe-manager");
		expect(fault?.message).toContain('"left-pad"');
		expect(marker()).toBe(false);
	});

	test("a malformed manifest is refused at install, before the loader is reached", () => {
		const outcome = installPlugin({ ...MANIFEST, id: "../escape" }, SOURCE);
		expect(outcome.ok).toBe(false);
		expect(listFaults().at(-1)?.reason).toBe(FAULT_REASONS.invalidId);
		expect(getPluginsSnapshot().installed).toHaveLength(0);
	});
});

describe("the scoped log", () => {
	test("a plugin's own log lines reach the manager's store, stamped with its id", async () => {
		const source = `export default { setup(host) { host.log.info("hello from the probe"); } };`;
		installPlugin(MANIFEST, source);
		await enablePlugin("probe-manager");
		const line = listLogs().at(-1);
		expect(line?.pluginId).toBe("probe-manager");
		expect(line?.message).toBe("hello from the probe");
	});
});

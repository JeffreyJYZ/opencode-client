import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { updateSettings } from "@/app/settings/store";
import { PluginsSection } from "@/components/PluginsSection";
import {
	PLUGINS_ACTION,
	PLUGINS_CAPABILITY_NOTE,
	PLUGINS_FAULT_COUNT,
	PLUGINS_INSTALL_LABEL,
	PLUGINS_NO_CAPABILITIES,
} from "@/constants/pluginManager";
import { PLUGINS_SECTION } from "@/constants/plugins";
import { clearFaults } from "@/plugins/faults";
import { resetInstalled } from "@/plugins/installed";
import { clearLogs } from "@/plugins/logs";
import { disablePlugin, installPlugin } from "@/plugins/manager";
import { getSlotContributions } from "@/plugins/registry";

/**
 * The Plugins section (M4.5): always present, no control that removes it, and each
 * row's state, declared capabilities and recorded fault text read back from the
 * stores rather than remembered in the component.
 */

const MANIFEST = {
	id: "probe-section",
	name: "Probe Section",
	version: "3.0.0",
	apiVersion: "0.1",
	engines: { app: "*" },
	capabilities: ["plugin-data", "net"],
};

const SOURCE = `export default { setup(host) {
	host.ui.register({ id: "probe-section.marker", slot: "topnav.right", component: () => null });
	return { dispose() {} };
} };`;

const BARE = `import "left-pad";\nexport default { setup() {} };`;

const row = (): HTMLElement =>
	document.querySelector('[data-plugin-id="probe-section"]') as HTMLElement;
const state = (): string | undefined => row().dataset.pluginState;
const registered = (): boolean =>
	getSlotContributions("topnav.right").some((entry) => entry.id === "probe-section.marker");

afterEach(cleanup);

beforeEach(() => {
	// The master switch is off by default (spec 040 §Model); the row tests exercise
	// the loader, so it is on here and each plugin's own flag gates it.
	updateSettings({ pluginsEnabled: true });
	resetInstalled();
	clearFaults();
	clearLogs();
});

afterEach(() => {
	disablePlugin("probe-section");
	resetInstalled();
	updateSettings({ pluginsEnabled: false });
	clearFaults();
});

describe("the section itself", () => {
	test("is always present and offers no control that disables it", () => {
		render(<PluginsSection />);
		// The section's title is the host's (M4.11), so the marker is what proves
		// the section rendered here; the heading itself is asserted by the surface.
		expect(document.querySelector(`[data-section="${PLUGINS_SECTION}"]`)).toBeTruthy();
		expect(screen.getByRole("button", { name: PLUGINS_INSTALL_LABEL })).toBeTruthy();
		// Every action targets a plugin; none targets the manager.
		expect(document.querySelectorAll("[data-plugin-action]")).toHaveLength(0);
		// The default view surfaces the fault count (spec 040 §The host).
		expect(document.querySelector("[data-plugin-fault-count]")?.textContent).toBe(
			PLUGINS_FAULT_COUNT(0),
		);
	});

	test("an empty store states that nothing is installed", () => {
		render(<PluginsSection />);
		expect(document.querySelector("[data-plugin-empty]")).toBeTruthy();
	});
});

describe("a plugin's row", () => {
	test("shows the id, the version, the declared capabilities and the state", () => {
		installPlugin(MANIFEST, SOURCE);
		render(<PluginsSection />);
		expect(state()).toBe("disabled");
		expect(row().dataset.pluginCapabilities).toBe("plugin-data,net");
		expect(row().textContent).toContain("probe-section 3.0.0");
		expect(row().textContent).toContain("plugin-data, net");
		// The capabilities are consent labels, and the row says so.
		expect(row().textContent).toContain(PLUGINS_CAPABILITY_NOTE);
		expect(row().textContent).not.toContain("sandbox");
	});

	test("a plugin declaring nothing says so rather than rendering an empty list", () => {
		installPlugin({ ...MANIFEST, capabilities: undefined }, SOURCE);
		render(<PluginsSection />);
		expect(row().dataset.pluginCapabilities).toBe("");
		expect(row().textContent).toContain(PLUGINS_NO_CAPABILITIES);
	});

	test("enable loads the plugin and disable retracts its contribution", async () => {
		installPlugin(MANIFEST, SOURCE);
		render(<PluginsSection />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: PLUGINS_ACTION.enable }));
		});
		expect(state()).toBe("loaded");
		expect(registered()).toBe(true);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: PLUGINS_ACTION.disable }));
		});
		expect(state()).toBe("disabled");
		expect(registered()).toBe(false);
	});

	test("a plugin that cannot load shows the fault text the host recorded", async () => {
		installPlugin(MANIFEST, BARE);
		render(<PluginsSection />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: PLUGINS_ACTION.enable }));
		});
		expect(state()).toBe("refused");
		const fault = document.querySelector('[data-plugin-fault="bare-specifier"]');
		expect(fault?.textContent).toContain('"left-pad"');
		expect(document.querySelector("[data-plugin-fault-count]")?.textContent).toBe(
			PLUGINS_FAULT_COUNT(1),
		);
	});

	test("uninstall removes the row", async () => {
		installPlugin(MANIFEST, SOURCE);
		render(<PluginsSection />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: PLUGINS_ACTION.uninstall }));
		});
		expect(document.querySelector('[data-plugin-id="probe-section"]')).toBeNull();
		expect(document.querySelector("[data-plugin-empty]")).toBeTruthy();
	});
});

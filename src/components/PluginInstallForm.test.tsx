import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PluginInstallForm } from "@/components/PluginInstallForm";
import { PLUGINS_INSTALL_LABEL } from "@/constants/pluginManager";
import { clearFaults } from "@/plugins/faults";
import { getInstalled, listInstalled, resetInstalled } from "@/plugins/installed";
import { clearLogs } from "@/plugins/logs";

/**
 * The install form (M4.5, spec 040 §Build, install, develop), on its own: the
 * manager's one way in. A manifest that is not JSON never reaches the store, and a
 * pasted pair installs the **validated** record, disabled.
 */

const MANIFEST = {
	id: "probe-install",
	name: "Probe Install",
	version: "1.0.0",
	apiVersion: "0.1",
	engines: { app: "*" },
	capabilities: ["plugin-data", "net"],
};

afterEach(cleanup);

beforeEach(() => {
	resetInstalled();
	clearFaults();
	clearLogs();
});

describe("the install form", () => {
	test("refuses a manifest that is not JSON without touching the store", () => {
		render(<PluginInstallForm />);
		const manifest = document.querySelector("[data-plugin-manifest]") as HTMLTextAreaElement;
		manifest.value = "not json";
		fireEvent.click(screen.getByRole("button", { name: PLUGINS_INSTALL_LABEL }));
		expect(document.querySelector("[data-plugin-message]")?.textContent).toContain(
			"not valid JSON",
		);
		expect(listInstalled()).toHaveLength(0);
	});

	test("installs a pasted manifest and source", () => {
		render(<PluginInstallForm />);
		const manifest = document.querySelector("[data-plugin-manifest]") as HTMLTextAreaElement;
		const source = document.querySelector("[data-plugin-source]") as HTMLTextAreaElement;
		manifest.value = JSON.stringify(MANIFEST);
		source.value = "export default { setup() {} };";
		fireEvent.click(screen.getByRole("button", { name: PLUGINS_INSTALL_LABEL }));
		expect(document.querySelector("[data-plugin-message]")?.textContent).toContain(
			'Installed "probe-install"',
		);
		expect(getInstalled("probe-install")?.manifest.capabilities).toEqual([
			"plugin-data",
			"net",
		]);
	});
});

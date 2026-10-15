import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { resetSettingsSections } from "@/app/settings/sections";
import { sessionTab } from "@/app/tabModel";
import { getTabSnapshot, openTab, resetTabs } from "@/app/tabs";
import { COMMAND_RUN_EVENT } from "@/constants/palette";
import { ROUTE_PATH } from "@/constants/routes";
import { TAB_KIND } from "@/constants/tabs";
import { openPalette, paletteClient, renderPalette } from "@/test/palette";
import { pickerRow } from "@/test/picker";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);
afterEach(resetTabs);
afterEach(resetSettingsSections);
beforeEach(() => window.history.pushState(null, "", ROUTE_PATH.home));

const PAGE = {
	data: [pickerRow("ses_1", "Alpha", "/dev/a"), pickerRow("ses_2", "Beta", "/dev/b")],
	cursor: { next: "c2" },
};
const COMMANDS = [{ name: "commit", description: "Commit changes" }];

function client() {
	return paletteClient(PAGE, COMMANDS);
}

/** Type a query that narrows the list to one row, then press Enter. */
async function narrowAndEnter(query: string): Promise<void> {
	const input = openPalette();
	fireEvent.change(input, { target: { value: query } });
	await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
	fireEvent.keyDown(input, { key: "Enter" });
	await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
}

describe("CommandPalette activation", () => {
	test("Enter opens the highlighted session through the tab store", async () => {
		renderPalette(client());
		await narrowAndEnter("beta");
		expect(window.location.pathname).toBe("/session/ses_2");
		const tabs = getTabSnapshot().tabs;
		expect(tabs.some((tab) => tab.kind === TAB_KIND.session && tab.id === "ses_2")).toBe(true);
	});

	test("Enter on a settings section opens settings as a tab (the fourth entry)", async () => {
		renderPalette(client());
		await narrowAndEnter("server");
		expect(window.location.pathname).toBe(ROUTE_PATH.settings);
		expect(getTabSnapshot().tabs.some((tab) => tab.kind === TAB_KIND.settings)).toBe(true);
	});

	test("Enter on an open tab activates it", async () => {
		openTab(sessionTab("ses_1"));
		renderPalette(client());
		await narrowAndEnter("tab");
		expect(window.location.pathname).toBe(`${ROUTE_PATH.session}/ses_1`);
	});

	test("Enter on a command emits its run signal, never a dead key", async () => {
		const seen: string[] = [];
		const onRun = (event: Event) => {
			seen.push((event as CustomEvent<{ name: string }>).detail.name);
		};
		window.addEventListener(COMMAND_RUN_EVENT, onRun);
		renderPalette(client());
		await narrowAndEnter("commit");
		window.removeEventListener(COMMAND_RUN_EVENT, onRun);
		expect(seen).toEqual(["commit"]);
	});
});

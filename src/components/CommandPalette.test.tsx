import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { resetSettingsSections } from "@/app/settings/sections";
import { sessionTab } from "@/app/tabModel";
import { openTab, resetTabs } from "@/app/tabs";
import { entryOptionId } from "@/components/CommandPaletteRow";
import { ROUTE_PATH } from "@/constants/routes";
import { SESSION_PICKER_EVENT, SETTINGS_TAB_LABEL } from "@/constants/tabs";
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

describe("CommandPalette", () => {
	test("⌘K opens it and it lists all four sources", async () => {
		openTab(sessionTab("ses_1"));
		renderPalette(client());
		openPalette();
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(6));
		const text = screen
			.getAllByRole("option")
			.map((option) => option.textContent)
			.join("|");
		expect(text).toContain("Server"); // the settings section, from the registry
		expect(text).toContain(SETTINGS_TAB_LABEL); // a tab row
		expect(text).toContain("Alpha"); // a session row
		expect(text).toContain("Commit changes"); // a command row
	});

	test("it filters as you type", async () => {
		renderPalette(client());
		const input = openPalette();
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(5));
		fireEvent.change(input, { target: { value: "beta" } });
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
		expect(screen.getByRole("option").textContent).toContain("Beta");
	});

	test("↑/↓ move the highlight and never wrap past either end", async () => {
		renderPalette(client());
		const input = openPalette();
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(5));
		expect(input.getAttribute("aria-activedescendant")).toBe(entryOptionId("settings:connect"));
		for (let index = 0; index < 8; index++) fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(input.getAttribute("aria-activedescendant")).toBe(entryOptionId("command:commit"));
		for (let index = 0; index < 8; index++) fireEvent.keyDown(input, { key: "ArrowUp" });
		expect(input.getAttribute("aria-activedescendant")).toBe(entryOptionId("settings:connect"));
	});

	test("Escape closes it and returns focus to the opener", async () => {
		const opener = renderPalette(client());
		const input = openPalette();
		await waitFor(() => expect(document.activeElement).toBe(input));
		fireEvent.keyDown(input, { key: "Escape" });
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		expect(document.activeElement).toBe(opener);
	});

	test("a mousedown outside the dialog closes it", async () => {
		renderPalette(client());
		openPalette();
		await waitFor(() => expect(screen.getByRole("dialog")).toBeDefined());
		fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement);
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});

	test("the picker's signal closes the palette (one overlay owns Escape)", async () => {
		renderPalette(client());
		openPalette();
		await waitFor(() => expect(screen.getByRole("dialog")).toBeDefined());
		act(() => {
			window.dispatchEvent(new CustomEvent(SESSION_PICKER_EVENT));
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});
});

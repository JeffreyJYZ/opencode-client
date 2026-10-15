import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { resetSettingsSections } from "@/app/settings/sections";
import { resetTabs } from "@/app/tabs";
import { ROUTE_PATH } from "@/constants/routes";
import type { OpenCodeClient } from "@/session/client";
import { openPalette, renderPalette } from "@/test/palette";
import { FIRST_PAGE, type PickerPage, pagedClient, pickerRow } from "@/test/picker";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);
afterEach(resetTabs);
afterEach(resetSettingsSections);
beforeEach(() => window.history.pushState(null, "", ROUTE_PATH.home));

/**
 * Three roots across two pages: the third ("Gamma older") is reachable only by
 * following the cursor, so a one-page source silently omits it.
 */
const ONE_TWO_PLUS_OLDER: Record<string, PickerPage> = {
	[FIRST_PAGE]: {
		data: [pickerRow("ses_1", "Alpha", "/dev/a"), pickerRow("ses_2", "Beta", "/dev/b")],
		cursor: { next: "c2" },
	},
	c2: { data: [pickerRow("ses_3", "Gamma older", "/dev/c")], cursor: { next: "c3" } },
};

function optionsText(): string {
	return screen
		.getAllByRole("option")
		.map((option) => option.textContent ?? "")
		.join("|");
}

/** The paged client plus the palette's other server source, `command.list`. */
function client(pages: Record<string, PickerPage>): { client: OpenCodeClient; calls: unknown[] } {
	const paged = pagedClient(pages);
	return {
		client: {
			...paged.client,
			command: { list: () => Promise.resolve({ data: [] }) },
		} as unknown as OpenCodeClient,
		calls: paged.calls,
	};
}

describe("CommandPalette reaching past the first page", () => {
	/**
	 * The M1.6b fix: the session source follows the cursor, so a root older than
	 * one page is findable by typing — proved with an injected page size of two
	 * rather than seeding 60 sessions, exactly as the picker's page test is.
	 */
	test("an older-than-one-page root session is findable by typing", async () => {
		const { client: target, calls } = client(ONE_TWO_PLUS_OLDER);
		renderPalette(target, 2);
		const input = openPalette();
		await waitFor(() => expect(optionsText()).toContain("Alpha"));
		expect(optionsText()).not.toContain("Gamma older");

		fireEvent.change(input, { target: { value: "gamma" } });
		await waitFor(() => expect(optionsText()).toContain("Gamma older"));
		expect(screen.getAllByRole("option")).toHaveLength(1);
		// Opening fetched page one; the no-match query pulled page two by cursor.
		expect(calls.at(-1)).toMatchObject({ cursor: "c2", limit: 2 });
	});
});

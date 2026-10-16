import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { requestSessionPicker } from "@/app/tabSync";
import { getTabSnapshot, resetTabs } from "@/app/tabs";
import { SessionPicker } from "@/components/SessionPicker";
import { optionId } from "@/components/SessionPickerRow";
import { PICKER_LOAD_MORE_LABEL, PICKER_SEARCH_LABEL } from "@/constants/picker";
import { ROUTE_PATH } from "@/constants/routes";
import { NEW_SESSION_EVENT } from "@/constants/tabs";
import { ClientProvider } from "@/session/ClientProvider";
import { flush } from "@/test/act";
import { FIRST_PAGE, type PickerPage, pagedClient, pickerRow } from "@/test/picker";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);
afterEach(resetTabs);
beforeEach(() => window.history.pushState(null, "", ROUTE_PATH.home));

const OPEN_LABEL = "open picker";
// Every page with rows carries `next`; `renderPicker`'s `c2` is the empty terminal page.
const THREE: PickerPage = {
	data: [
		pickerRow("ses_a", "Alpha", "/dev/a"),
		pickerRow("ses_b", "Beta", "/dev/b"),
		pickerRow("ses_c", "Gamma", "/dev/c"),
	],
	cursor: { next: "c2" },
};
const ONE: PickerPage = { data: [pickerRow("ses_a", "Alpha", "/dev/a")], cursor: { next: "c2" } };

function renderPicker(page: PickerPage) {
	const { client } = pagedClient({ [FIRST_PAGE]: page, c2: { data: [], cursor: {} } });
	render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<button type="button" onClick={requestSessionPicker}>
				{OPEN_LABEL}
			</button>
			<SessionPicker pageSize={3} />
		</ClientProvider>,
	);
	const opener = screen.getByText(OPEN_LABEL);
	opener.focus();
	return opener;
}

/** Open the picker and settle the first page's refetch, so no test has to poll (M1.4d). */
async function openInput(): Promise<HTMLInputElement> {
	fireEvent.click(screen.getByText(OPEN_LABEL));
	await flush();
	return screen.getByLabelText(PICKER_SEARCH_LABEL) as HTMLInputElement;
}

function focusedId(input: HTMLInputElement): string | null {
	return input.getAttribute("aria-activedescendant");
}

describe("SessionPicker keyboard and dismissal", () => {
	test("↑/↓ move the highlight and never wrap past either end", async () => {
		renderPicker(THREE);
		const input = await openInput();
		expect(screen.getAllByRole("option")).toHaveLength(3);
		expect(focusedId(input)).toBe(optionId("ses_a"));
		for (let index = 0; index < 6; index++) fireEvent.keyDown(input, { key: "ArrowDown" });
		expect(focusedId(input)).toBe(optionId("ses_c"));
		for (let index = 0; index < 6; index++) fireEvent.keyDown(input, { key: "ArrowUp" });
		expect(focusedId(input)).toBe(optionId("ses_a"));
	});

	test("Enter opens the highlighted session through the tab store and closes", async () => {
		renderPicker(THREE);
		const input = await openInput();
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "Enter" });

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(window.location.pathname).toBe("/session/ses_b");
		const snapshot = getTabSnapshot();
		const ids = snapshot.tabs.map((tab) => (tab as { id?: string }).id);
		expect(ids).toContain("ses_b");
	});

	test("a click on a row opens it too", async () => {
		renderPicker(THREE);
		await openInput();
		fireEvent.click(screen.getAllByRole("option")[2]);
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(window.location.pathname).toBe("/session/ses_c");
	});

	test("Escape closes the picker and returns focus to the opener", async () => {
		const opener = renderPicker(THREE);
		const input = await openInput();
		expect(document.activeElement).toBe(input);
		fireEvent.keyDown(input, { key: "Escape" });
		expect(screen.queryByRole("dialog")).toBeNull();
		expect(document.activeElement).toBe(opener);
	});

	test("a mousedown outside the dialog closes it", async () => {
		renderPicker(THREE);
		await openInput();
		expect(screen.getByRole("dialog")).toBeDefined();
		const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
		fireEvent.mouseDown(overlay);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	test("Tab is trapped: Shift+Tab from the field wraps to the last control", async () => {
		renderPicker(THREE);
		const input = await openInput();
		expect(screen.getAllByRole("option")).toHaveLength(3);
		expect(screen.getByText(PICKER_LOAD_MORE_LABEL)).toBeDefined();
		fireEvent.keyDown(input, { key: "Tab", shiftKey: true });
		expect(document.activeElement).toBe(screen.getByText(PICKER_LOAD_MORE_LABEL));
	});

	test("a query with no match on the only page is its own state", async () => {
		renderPicker(ONE);
		const input = await openInput();
		expect(screen.getAllByRole("option")).toHaveLength(1);
		fireEvent.change(input, { target: { value: "zzz" } });
		expect(screen.queryAllByRole("option")).toHaveLength(0);
		expect(screen.queryByRole("dialog")).not.toBeNull();
	});

	/**
	 * The row renders only the last directory segment, so a query that hits a
	 * middle segment keeps nothing — it used to keep the row and mark nothing.
	 */
	test("a query matching only a middle path segment keeps no row", async () => {
		renderPicker({
			data: [pickerRow("ses_a", "Alpha", "/dev/monorepos/opencode")],
			cursor: { next: "c2" },
		});
		const input = await openInput();
		expect(screen.getAllByRole("option")).toHaveLength(1);
		fireEvent.change(input, { target: { value: "monorepos" } });
		expect(screen.queryAllByRole("option")).toHaveLength(0);
		expect(screen.getByRole("dialog")).toBeDefined();
	});

	test("the `+` flow's signal closes the picker (one overlay at a time)", async () => {
		renderPicker(THREE);
		await openInput();
		// The click's commit opened it; `act` flushes the close a bare dispatch only schedules.
		expect(screen.getByRole("dialog")).toBeDefined();
		await act(async () => window.dispatchEvent(new CustomEvent(NEW_SESSION_EVENT)));
		expect(screen.queryByRole("dialog")).toBeNull();
	});
});

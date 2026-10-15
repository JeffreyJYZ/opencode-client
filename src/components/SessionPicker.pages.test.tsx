import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { requestSessionPicker } from "@/app/tabSync";
import { resetTabs } from "@/app/tabs";
import { SessionPicker } from "@/components/SessionPicker";
import {
	PICKER_LOAD_MORE_LABEL,
	PICKER_NO_MATCH_LABEL,
	PICKER_SEARCH_LABEL,
} from "@/constants/picker";
import { ROUTE_PATH } from "@/constants/routes";
import { ClientProvider } from "@/session/ClientProvider";
import type { OpenCodeClient } from "@/session/client";
import { childRow, FIRST_PAGE, type PickerPage, pagedClient, pickerRow } from "@/test/picker";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);
afterEach(resetTabs);
beforeEach(() => window.history.pushState(null, "", ROUTE_PATH.home));

const OPEN_LABEL = "open picker";

function renderPicker(client: OpenCodeClient, pageSize = 2) {
	const utils = render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<button type="button" onClick={requestSessionPicker}>
				{OPEN_LABEL}
			</button>
			<SessionPicker pageSize={pageSize} />
		</ClientProvider>,
	);
	const opener = screen.getByText(OPEN_LABEL);
	return { ...utils, opener };
}

/** Open the picker from the nav's event and hand back its field. */
function open(utils: ReturnType<typeof renderPicker>) {
	fireEvent.click(utils.opener);
	return screen.getByLabelText(PICKER_SEARCH_LABEL) as HTMLInputElement;
}

function text(role: "option" | "dialog") {
	return screen.getAllByRole(role).map((node) => node.textContent ?? "");
}

const ONE_TWO_PLUS_OLDER: Record<string, PickerPage> = {
	[FIRST_PAGE]: {
		data: [pickerRow("ses_1", "Alpha", "/dev/a"), pickerRow("ses_2", "Beta", "/dev/b")],
		cursor: { next: "c2" },
	},
	// Measured shape: a short page still carries `next`, so page two is the end.
	c2: { data: [pickerRow("ses_3", "Gamma older", "/dev/c")], cursor: { next: "c3" } },
};

describe("SessionPicker reaching past the first page", () => {
	/**
	 * The plan row's evidence, proved with an injected page size of two instead
	 * of seeding 60 sessions: three rows across two pages, and the third row is
	 * only reachable by following the cursor.
	 */
	test("the second page loads with an injected small page size", async () => {
		const { client, calls } = pagedClient(ONE_TWO_PLUS_OLDER);
		const utils = renderPicker(client, 2);
		open(utils);
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
		expect(text("option").join("|")).not.toContain("Gamma older");

		fireEvent.click(screen.getByText(PICKER_LOAD_MORE_LABEL));
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(3));
		expect(text("option").join("|")).toContain("Gamma older");
		// Opening the picker refetched page one, so the cursor call is last.
		expect(calls.at(-1)).toMatchObject({ cursor: "c2", limit: 2 });
	});

	test("a search with no match on page one pulls the page that holds it", async () => {
		const { client } = pagedClient(ONE_TWO_PLUS_OLDER);
		const utils = renderPicker(client, 2);
		const input = open(utils);
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));

		fireEvent.change(input, { target: { value: "gamma" } });
		await waitFor(() => expect(text("option").join("|")).toContain("Gamma older"));
		expect(screen.getAllByRole("option")).toHaveLength(1);
	});
});

describe("SessionPicker search and states", () => {
	test("filters by the rendered directory segment, not only by title", async () => {
		const { client } = pagedClient({
			[FIRST_PAGE]: {
				data: [
					pickerRow("ses_1", "Alpha", "/dev/apps/monorepos"),
					pickerRow("ses_2", "Beta", "/dev/apps/y"),
				],
				cursor: {},
			},
		});
		const utils = renderPicker(client);
		const input = open(utils);
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
		fireEvent.change(input, { target: { value: "MONOREPOS" } });
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
		expect(text("option")[0]).toContain("Alpha");
	});

	test("the matched run is a mark styled from a token, never a raw colour", async () => {
		const { client } = pagedClient({
			[FIRST_PAGE]: { data: [pickerRow("ses_1", "Alpha one", "/dev/a")], cursor: {} },
		});
		const utils = renderPicker(client);
		const input = open(utils);
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
		fireEvent.change(input, { target: { value: "ph" } });
		await waitFor(() => expect(utils.container.querySelector("mark")).not.toBeNull());
		const mark = utils.container.querySelector("mark") as HTMLElement;
		expect(mark.textContent).toBe("ph");
		const style = mark.getAttribute("style") ?? "";
		expect(style).toContain("var(--oc-accent)");
		expect(style).not.toMatch(/#|rgb/);
	});

	test("no match is its own honest state, never an empty list", async () => {
		const { client } = pagedClient({
			[FIRST_PAGE]: { data: [pickerRow("ses_1", "Alpha", "/dev/a")], cursor: {} },
		});
		const utils = renderPicker(client);
		const input = open(utils);
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
		fireEvent.change(input, { target: { value: "zzz" } });
		await waitFor(() => expect(screen.getByText(PICKER_NO_MATCH_LABEL)).toBeDefined());
		expect(screen.queryAllByRole("option")).toHaveLength(0);
	});

	test("root-only: a child session never appears", async () => {
		const { client } = pagedClient({
			[FIRST_PAGE]: {
				data: [
					pickerRow("ses_1", "Alpha", "/dev/a"),
					childRow("ses_c", "ses_1", "Subagent work"),
				],
				cursor: {},
			},
		});
		const utils = renderPicker(client);
		open(utils);
		await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(1));
		expect(screen.queryByText("Subagent work")).toBeNull();
	});
});

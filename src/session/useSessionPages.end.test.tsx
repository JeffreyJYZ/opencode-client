import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { SESSION_STATUS } from "@/constants/sessions";
import { useSessionPages } from "@/session/useSessionPages";
import { childRow, FIRST_PAGE, pagedClient, pickerRow } from "@/test/picker";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);

/**
 * The end-of-list boundary, split from `useSessionPages.test.tsx` to keep both
 * files under the length cap. Every fixture here models the measured page shape.
 */
describe("useSessionPages end of list", () => {
	/**
	 * The rule reads the **raw** server count, so a page that is full before the
	 * root-only filter is not the last page even when the filter shrinks the rows
	 * the picker keeps (`docs/opencode-api.md` §4).
	 */
	test("hasMore reads the raw page count before the root-only filter", async () => {
		const { client } = pagedClient({
			[FIRST_PAGE]: {
				data: [pickerRow("ses_1", "One", "/a"), childRow("ses_c", "ses_1", "Child")],
				cursor: { next: "c2" },
			},
		});
		const { result } = renderHook(() => useSessionPages(client, 2));
		await waitFor(() => expect(result.current.status).toBe(SESSION_STATUS.ready));
		expect(result.current.rows.map((row) => row.id)).toEqual(["ses_1"]);
		expect(result.current.hasMore).toBe(true);
	});

	test("a short page ends the list even though it carries a cursor", async () => {
		const { client } = pagedClient({
			[FIRST_PAGE]: {
				data: [pickerRow("ses_1", "One", "/a"), pickerRow("ses_2", "Two", "/b")],
				cursor: { next: "c2" },
			},
			c2: { data: [pickerRow("ses_3", "Three", "/c")], cursor: { next: "c3" } },
		});
		const { result } = renderHook(() => useSessionPages(client, 2));
		await waitFor(() => expect(result.current.rows).toHaveLength(2));
		expect(result.current.hasMore).toBe(true);
		await act(async () => {
			result.current.loadMore();
		});
		await waitFor(() => expect(result.current.rows).toHaveLength(3));
		expect(result.current.hasMore).toBe(false);
	});

	/**
	 * An exact multiple is the one case that must follow the cursor onto the
	 * terminal page: `{ data: [], cursor: {} }` — empty, no `next`.
	 */
	test("an exact multiple ends on the empty terminal page", async () => {
		const { client, calls } = pagedClient({
			[FIRST_PAGE]: {
				data: [pickerRow("ses_1", "One", "/a"), pickerRow("ses_2", "Two", "/b")],
				cursor: { next: "c2" },
			},
			c2: {
				data: [pickerRow("ses_3", "Three", "/c"), pickerRow("ses_4", "Four", "/d")],
				cursor: { next: "c3" },
			},
			c3: { data: [], cursor: {} },
		});
		const { result } = renderHook(() => useSessionPages(client, 2));
		await waitFor(() => expect(result.current.rows).toHaveLength(2));
		await act(async () => {
			result.current.loadMore();
		});
		await waitFor(() => expect(result.current.rows).toHaveLength(4));
		expect(result.current.hasMore).toBe(true);
		await act(async () => {
			result.current.loadMore();
		});
		await waitFor(() => expect(result.current.hasMore).toBe(false));
		expect(result.current.rows).toHaveLength(4);
		expect(calls[2]).toMatchObject({ cursor: "c3", limit: 2 });
	});
});

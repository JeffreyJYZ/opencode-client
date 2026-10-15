import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { SESSION_PAGE_LIMIT, SESSION_STATUS } from "@/constants/sessions";
import { useSessionPages } from "@/session/useSessionPages";
import { childRow, FIRST_PAGE, pagedClient, pickerRow } from "@/test/picker";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);

describe("useSessionPages", () => {
	test("none state with no client", () => {
		const { result } = renderHook(() => useSessionPages(null, 2));
		expect(result.current.status).toBe(SESSION_STATUS.none);
		expect(result.current.rows).toHaveLength(0);
		expect(result.current.hasMore).toBe(false);
	});

	test("error state when the first page rejects, distinct from empty", async () => {
		const client = {
			session: { list: () => Promise.reject(new Error("boom")) },
		} as never;
		const { result } = renderHook(() => useSessionPages(client, 2));
		await waitFor(() => expect(result.current.status).toBe(SESSION_STATUS.error));
	});

	test("empty state when the first page has no rows", async () => {
		const { client } = pagedClient({ [FIRST_PAGE]: { data: [], cursor: {} } });
		const { result } = renderHook(() => useSessionPages(client, 2));
		await waitFor(() => expect(result.current.status).toBe(SESSION_STATUS.empty));
	});

	test("the default page size is SESSION_PAGE_LIMIT and a root-only filter is applied", async () => {
		const { client, calls } = pagedClient({
			[FIRST_PAGE]: {
				data: [pickerRow("ses_1", "One", "/a"), childRow("ses_c", "ses_1", "Child")],
				cursor: {},
			},
		});
		const { result } = renderHook(() => useSessionPages(client));
		await waitFor(() => expect(result.current.status).toBe(SESSION_STATUS.ready));
		expect(calls[0]).toMatchObject({
			parentID: null,
			order: "desc",
			limit: SESSION_PAGE_LIMIT,
		});
		expect(result.current.rows.map((row) => row.id)).toEqual(["ses_1"]);
		expect(result.current.hasMore).toBe(false);
	});

	/**
	 * The row's own evidence, proved without seeding 60 sessions: an injected
	 * page size of two, three rows across two pages, and the cursor followed.
	 */
	test("the second page loads when the cursor is followed", async () => {
		const { client, calls } = pagedClient({
			[FIRST_PAGE]: {
				data: [pickerRow("ses_1", "One", "/a"), pickerRow("ses_2", "Two", "/b")],
				cursor: { next: "c2" },
			},
			c2: { data: [pickerRow("ses_3", "Three", "/c")], cursor: {} },
		});
		const { result } = renderHook(() => useSessionPages(client, 2));
		await waitFor(() => expect(result.current.rows).toHaveLength(2));
		expect(result.current.hasMore).toBe(true);

		await act(async () => {
			result.current.loadMore();
		});
		await waitFor(() => expect(result.current.rows).toHaveLength(3));
		expect(result.current.rows.map((row) => row.id)).toEqual(["ses_1", "ses_2", "ses_3"]);
		expect(result.current.hasMore).toBe(false);
		expect(calls[1]).toMatchObject({ cursor: "c2", limit: 2 });
	});

	test("a failed load-more keeps the cursor and says so", async () => {
		let attempts = 0;
		const client = {
			session: {
				list: (arg: { cursor?: string }) => {
					if (arg?.cursor === "c2") {
						attempts++;
						return Promise.reject(new Error("boom"));
					}
					return Promise.resolve({
						data: [pickerRow("ses_1", "One", "/a")],
						cursor: { next: "c2" },
					});
				},
			},
		} as never;
		const { result } = renderHook(() => useSessionPages(client, 1));
		await waitFor(() => expect(result.current.hasMore).toBe(true));
		await act(async () => {
			result.current.loadMore();
		});
		await waitFor(() => expect(result.current.loadError).toBe(true));
		expect(result.current.hasMore).toBe(true);
		expect(attempts).toBe(1);
	});

	test("a response that repeats a row does not duplicate it", async () => {
		const { client } = pagedClient({
			[FIRST_PAGE]: { data: [pickerRow("ses_1", "One", "/a")], cursor: { next: "c2" } },
			c2: { data: [pickerRow("ses_1", "One", "/a")], cursor: {} },
		});
		const { result } = renderHook(() => useSessionPages(client, 1));
		await waitFor(() => expect(result.current.hasMore).toBe(true));
		await act(async () => {
			result.current.loadMore();
		});
		await waitFor(() => expect(result.current.hasMore).toBe(false));
		expect(result.current.rows).toHaveLength(1);
	});
});

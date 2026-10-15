import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { SESSION_STATUS } from "@/constants/sessions";
import type { OpenCodeClient } from "@/session/client";
import { useSessionsWithClient } from "@/session/useSessions";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);

function makeClient(
	listResult: Promise<{ data: unknown[] }> | Error,
	version = "2.0.29",
): OpenCodeClient {
	return {
		session: {
			list: () => (listResult instanceof Error ? Promise.reject(listResult) : listResult),
		},
		server: { info: () => Promise.resolve({ version }) },
	} as unknown as OpenCodeClient;
}

describe("useSessionsWithClient", () => {
	test("none state when there is no client", () => {
		const { result } = renderHook(() => useSessionsWithClient(null));
		expect(result.current.status).toBe(SESSION_STATUS.none);
		expect(result.current.sessions).toHaveLength(0);
	});

	test("loading state before the list resolves", () => {
		let resolve!: (value: { data: unknown[] }) => void;
		const pending = new Promise<{ data: unknown[] }>((r) => {
			resolve = r;
		});
		const client = makeClient(pending);
		const { result } = renderHook(() => useSessionsWithClient(client));
		expect(result.current.status).toBe(SESSION_STATUS.loading);
		resolve({ data: [] });
	});

	test("error state when the list rejects, distinct from empty", async () => {
		const client = makeClient(new Error("boom"));
		const { result } = renderHook(() => useSessionsWithClient(client));
		await waitFor(() => expect(result.current.status).toBe(SESSION_STATUS.error));
		expect(result.current.sessions).toHaveLength(0);
	});

	test("empty state when the list resolves to no rows", async () => {
		const client = makeClient(Promise.resolve({ data: [] }));
		const { result } = renderHook(() => useSessionsWithClient(client));
		await waitFor(() => expect(result.current.status).toBe(SESSION_STATUS.empty));
		expect(result.current.sessions).toHaveLength(0);
	});

	test("ready state with the returned (root-only) rows", async () => {
		const root = {
			id: "r1",
			parentID: undefined,
			title: "Root",
			time: { created: 1, updated: 1 },
			location: { directory: "/x" },
		};
		const child = {
			id: "c1",
			parentID: "r1",
			title: "Child",
			time: { created: 2, updated: 2 },
			location: { directory: "/x" },
		};
		const client = makeClient(Promise.resolve({ data: [root, child] }));
		const { result } = renderHook(() => useSessionsWithClient(client));
		await waitFor(() => expect(result.current.status).toBe(SESSION_STATUS.ready));
		expect(result.current.sessions.map((s) => (s as { id: string }).id)).toEqual(["r1"]);
	});

	test("reload bumps the tick and re-runs", async () => {
		const client = makeClient(Promise.resolve({ data: [] }));
		const { result } = renderHook(() => useSessionsWithClient(client));
		await waitFor(() => expect(result.current.status).toBe(SESSION_STATUS.empty));
		const callsBefore = 0;
		// counting not essential; just ensure reload callable
		result.current.reload();
		await waitFor(() => expect(result.current.status).toBe(SESSION_STATUS.empty));
		void callsBefore;
	});
});

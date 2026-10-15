import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { OpenCodeClient, SessionInfo } from "@opencode/client";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { navigate, sessionRoute } from "@/app/router";
import { toggleSidebar } from "@/app/settings/sidebarActions";
import { getSettings } from "@/app/settings/store";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "@/constants/settings";
import { SIDEBAR_LABEL } from "@/constants/sidebar";
import { ClientProvider } from "@/session/ClientProvider";
import { resetSettingsState } from "@/test/settings";

/**
 * M2.7's drag-resize and ⌘B-visibility, through the real store: a pointer drag
 * writes through `setSidebarWidth` (which clamps), and the sidebar's width and
 * presence follow the persisted cell. The bound itself is asserted in
 * `sidebarActions.test.ts`; here it is the wire from a drag to the store.
 */

const DIRECTORY = "/tmp/m2728-project";

const SESSION: SessionInfo = {
	id: "ses_root",
	projectID: "proj",
	cost: 0,
	tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
	time: { created: 1, updated: 1 },
	location: { directory: DIRECTORY },
};

function fixtureClient(info: SessionInfo = SESSION): OpenCodeClient {
	return {
		session: {
			get: () => Promise.resolve(info),
			stats: () => Promise.reject(new Error("not needed")),
			context: () => Promise.resolve([]),
			list: () => Promise.resolve({ data: [], cursor: {} }),
		},
		mcp: { list: () => Promise.resolve({ location: { directory: DIRECTORY }, data: [] }) },
		vcs: {
			status: () => Promise.resolve({ location: { directory: DIRECTORY }, data: [] }),
			get: () =>
				Promise.resolve({ location: { directory: DIRECTORY }, data: { branch: {} } }),
		},
	} as unknown as OpenCodeClient;
}

function renderSidebar(client: OpenCodeClient) {
	render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<Sidebar />
		</ClientProvider>,
	);
}

beforeEach(() => {
	resetSettingsState();
	navigate(sessionRoute(SESSION.id));
});
afterEach(cleanup);

describe("the sidebar", () => {
	test("a drag writes the width through the store, clamped to the bound", async () => {
		renderSidebar(fixtureClient());
		const handle = await screen.findByRole("separator");
		const aside = screen.getByLabelText(SIDEBAR_LABEL);

		// Drag left: 260 + 300 would be 560, so the store clamps to the maximum.
		fireEvent.pointerDown(handle, { clientX: 400 });
		fireEvent.pointerMove(window, { clientX: 100 });
		expect(getSettings().sidebar.width).toBe(SIDEBAR_MAX_WIDTH);
		expect(aside.style.width).toBe(`${SIDEBAR_MAX_WIDTH}px`);
		fireEvent.pointerUp(window);

		// Drag right, past zero: the store clamps to the minimum.
		fireEvent.pointerDown(handle, { clientX: 100 });
		fireEvent.pointerMove(window, { clientX: 2_000 });
		expect(getSettings().sidebar.width).toBe(SIDEBAR_MIN_WIDTH);
		expect(aside.style.width).toBe(`${SIDEBAR_MIN_WIDTH}px`);
		fireEvent.pointerUp(window);
	});

	test("⌘B's toggle hides and shows the sidebar", async () => {
		renderSidebar(fixtureClient());
		expect(await screen.findByLabelText(SIDEBAR_LABEL)).toBeDefined();
		act(() => toggleSidebar());
		expect(screen.queryByLabelText(SIDEBAR_LABEL)).toBeNull();
		act(() => toggleSidebar());
		expect(screen.getByLabelText(SIDEBAR_LABEL)).toBeDefined();
	});

	test("a child session gets no sidebar (spec 020 §Sidebar)", async () => {
		renderSidebar(fixtureClient({ ...SESSION, parentID: "ses_parent" }));
		// The panel read resolves asynchronously; wait for the child to be seen.
		await waitFor(() => expect(screen.queryByLabelText(SIDEBAR_LABEL)).toBeNull());
	});
});

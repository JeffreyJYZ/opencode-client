import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { OpenCodeClient, SessionInfo } from "@opencode/client";
import { cleanup, render, screen } from "@testing-library/react";
import { navigate, sessionRoute } from "@/app/router";
import {
	disposeSidebarBuiltins,
	registerSidebarBuiltins,
} from "@/components/sidebar/builtinPanels";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SIDEBAR_LABEL, SIDEBAR_PANEL_LABEL } from "@/constants/sidebar";
import { registerPanel, resetPanels } from "@/plugins/panels";
import { ClientProvider } from "@/session/ClientProvider";
import { resetSettingsState } from "@/test/settings";

/**
 * M4.11: the sidebar hosts the panel registry. A panel registered through
 * `panels.register` (the path a plugin uses) renders inside the region with its
 * own registered `title`, and the built-in panels register through the **same**
 * function — one registry, no second route.
 */

const DIRECTORY = "/tmp/m411-panels";

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

function renderSidebar(client: OpenCodeClient = fixtureClient()): void {
	render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<Sidebar />
		</ClientProvider>,
	);
}

beforeEach(() => {
	resetSettingsState();
	resetPanels();
	navigate(sessionRoute(SESSION.id));
});

afterEach(cleanup);
afterEach(() => {
	disposeSidebarBuiltins();
	resetPanels();
});

describe("the sidebar's panel registry", () => {
	test("a plugin panel renders with its registered title", async () => {
		registerPanel({
			id: "probe.panel",
			title: "Probe panel",
			component: () => <p>probe body</p>,
		});
		renderSidebar();
		expect(await screen.findByLabelText(SIDEBAR_LABEL)).toBeDefined();
		expect(screen.getByRole("heading", { name: "Probe panel" })).toBeDefined();
		expect(screen.getByText("probe body")).toBeDefined();
	});

	test("the built-in panels register through the same function", async () => {
		registerSidebarBuiltins();
		renderSidebar();
		await screen.findByLabelText(SIDEBAR_LABEL);
		for (const title of Object.values(SIDEBAR_PANEL_LABEL)) {
			expect(screen.getByRole("heading", { name: title })).toBeDefined();
		}
		// The Session body renders the data the host provided, not its own read.
		expect(await screen.findByText("m411-panels")).toBeDefined();
	});
});

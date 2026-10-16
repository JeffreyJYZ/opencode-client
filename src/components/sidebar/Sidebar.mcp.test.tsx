import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ConfigEntry, McpServer, OpenCodeClient, SessionInfo } from "@opencode/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { navigate, sessionRoute } from "@/app/router";
import {
	disposeSidebarBuiltins,
	registerSidebarBuiltins,
} from "@/components/sidebar/builtinPanels";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { mcpConnectLabel, mcpDetailsLabel, mcpDisconnectLabel } from "@/constants/sidebar";
import { resetPanels } from "@/plugins/panels";
import { ClientProvider } from "@/session/ClientProvider";
import { flush } from "@/test/act";
import { resetSettingsState } from "@/test/settings";

/**
 * M2.20's seams, wired: an MCP row's **Connect** reaches the server —
 * `mcp.connect` — with **that server's** own name, a connected row's
 * **Disconnect** reaches `mcp.disconnect` with its own name, the detail shows
 * the real `config.get()` document path, and the action refetches `mcp.list()`.
 */

const DIRECTORY = "/tmp/m220-mcp";
const CONFIG_PATH = `${DIRECTORY}/opencode.json`;

const SESSION: SessionInfo = {
	id: "ses_root",
	projectID: "proj",
	cost: 0,
	tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
	time: { created: 1, updated: 1 },
	location: { directory: DIRECTORY },
};

const SERVERS: McpServer[] = [
	{ name: "srv", status: { status: "connected" } },
	{ name: "broken", status: { status: "failed", error: "boom" } },
];

const CONFIG: ConfigEntry[] = [{ type: "document", path: CONFIG_PATH, info: {} } as ConfigEntry];

type Calls = {
	connects: Array<{ server: string }>;
	disconnects: Array<{ server: string }>;
	lists: number;
};

function mcpClient(calls: Calls): OpenCodeClient {
	return {
		session: {
			get: () => Promise.resolve(SESSION),
			context: () => Promise.resolve([]),
			list: () => Promise.resolve({ data: [], cursor: {} }),
		},
		mcp: {
			list: () => {
				calls.lists += 1;
				return Promise.resolve({ location: { directory: DIRECTORY }, data: SERVERS });
			},
			connect: (input: { server: string }) => {
				calls.connects.push(input);
				return Promise.resolve();
			},
			disconnect: (input: { server: string }) => {
				calls.disconnects.push(input);
				return Promise.resolve();
			},
		},
		config: { get: () => Promise.resolve(CONFIG) },
		vcs: {
			status: () => Promise.resolve({ location: { directory: DIRECTORY }, data: [] }),
			get: () =>
				Promise.resolve({ location: { directory: DIRECTORY }, data: { branch: {} } }),
		},
	} as unknown as OpenCodeClient;
}

function renderSidebar(client: OpenCodeClient): void {
	render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<Sidebar />
		</ClientProvider>,
	);
}

function freshCalls(): Calls {
	return { connects: [], disconnects: [], lists: 0 };
}

beforeEach(() => {
	resetSettingsState();
	resetPanels();
	registerSidebarBuiltins();
	navigate(sessionRoute(SESSION.id));
});

afterEach(cleanup);
afterEach(() => {
	disposeSidebarBuiltins();
	resetPanels();
});

describe("the MCP panel's actions (M2.20)", () => {
	test("a failed server's Connect reaches the server with that server's name", async () => {
		const calls = freshCalls();
		renderSidebar(mcpClient(calls));
		fireEvent.click(await screen.findByRole("button", { name: mcpDetailsLabel("broken") }));
		await flush();
		fireEvent.click(await screen.findByRole("button", { name: mcpConnectLabel("broken") }));
		await flush();
		expect(calls.connects).toEqual([{ server: "broken" }]);
		expect(calls.disconnects).toEqual([]);
	});

	test("a connected server's Disconnect reaches the server with its own name", async () => {
		const calls = freshCalls();
		renderSidebar(mcpClient(calls));
		fireEvent.click(await screen.findByRole("button", { name: mcpDetailsLabel("srv") }));
		await flush();
		fireEvent.click(await screen.findByRole("button", { name: mcpDisconnectLabel("srv") }));
		await flush();
		expect(calls.disconnects).toEqual([{ server: "srv" }]);
		expect(calls.connects).toEqual([]);
	});

	test("the detail shows the real config document path", async () => {
		const calls = freshCalls();
		renderSidebar(mcpClient(calls));
		fireEvent.click(await screen.findByRole("button", { name: mcpDetailsLabel("broken") }));
		expect(await screen.findByText(CONFIG_PATH)).toBeDefined();
	});

	test("an action refetches the server list", async () => {
		const calls = freshCalls();
		renderSidebar(mcpClient(calls));
		fireEvent.click(await screen.findByRole("button", { name: mcpDetailsLabel("broken") }));
		const before = calls.lists;
		fireEvent.click(await screen.findByRole("button", { name: mcpConnectLabel("broken") }));
		await flush();
		expect(calls.lists).toBeGreaterThan(before);
	});
});

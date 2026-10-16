import { afterEach, describe, expect, test } from "bun:test";
import type { McpServer } from "@opencode/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { McpPanel } from "@/components/sidebar/McpPanel";
import {
	mcpConnectLabel,
	mcpDetailsLabel,
	mcpDisconnectLabel,
	SIDEBAR_FIELD,
	SIDEBAR_MCP_CONFIG_UNAVAILABLE,
} from "@/constants/sidebar";

/**
 * M2.20: an MCP row opens. Each row is a `<button>` that toggles an inline
 * detail, and the detail carries the action the status calls for — Disconnect
 * for a connected server, Connect for any other status (`failed` and
 * `needs_auth` are not connected) — plus the real `config.get()` document
 * path, or the unavailable word when no document named one. The panel is a
 * pure function of its props: the actions and the path are handed in, so the
 * wiring of those actions to the real client is proven in
 * `Sidebar.mcp.test.tsx`.
 */

afterEach(cleanup);

const CONNECTED: McpServer = { name: "srv", status: { status: "connected" } };
const FAILED: McpServer = { name: "broken", status: { status: "failed", error: "boom" } };
const NEEDS_AUTH: McpServer = { name: "locked", status: { status: "needs_auth", error: "login" } };
const PENDING: McpServer = { name: "soon", status: { status: "pending" } };
const DISABLED: McpServer = { name: "off", status: { status: "disabled" } };

const CONFIG_PATH = "/tmp/m220-project/opencode.json";

function recorder() {
	const toggled: string[] = [];
	const connected: string[] = [];
	const disconnected: string[] = [];
	return {
		toggled,
		connected,
		disconnected,
		onToggle: (name: string) => toggled.push(name),
		onConnect: (name: string) => connected.push(name),
		onDisconnect: (name: string) => disconnected.push(name),
	};
}

function renderPanel(
	servers: readonly McpServer[],
	actions: ReturnType<typeof recorder>,
	expanded: string | null,
	configPath: string | null | undefined,
): void {
	render(
		<McpPanel
			data={{ servers }}
			expanded={expanded}
			onToggle={actions.onToggle}
			onConnect={actions.onConnect}
			onDisconnect={actions.onDisconnect}
			configPath={configPath}
		/>,
	);
}

describe("the MCP panel's rows (M2.20)", () => {
	test("a click on a row toggles that server's detail", () => {
		const actions = recorder();
		renderPanel([CONNECTED], actions, null, undefined);
		fireEvent.click(screen.getByRole("button", { name: mcpDetailsLabel("srv") }));
		expect(actions.toggled).toEqual(["srv"]);
	});

	test("a collapsed row shows no action and no path", () => {
		const actions = recorder();
		renderPanel([FAILED], actions, null, CONFIG_PATH);
		expect(screen.queryByRole("button", { name: mcpConnectLabel("broken") })).toBeNull();
		expect(screen.queryByText(CONFIG_PATH)).toBeNull();
	});

	test("a failed server's detail offers Connect with the config path", () => {
		const actions = recorder();
		renderPanel([FAILED], actions, "broken", CONFIG_PATH);
		fireEvent.click(screen.getByRole("button", { name: mcpConnectLabel("broken") }));
		expect(actions.connected).toEqual(["broken"]);
		expect(actions.disconnected).toEqual([]);
		expect(screen.getByText(CONFIG_PATH)).toBeDefined();
		expect(screen.getByText(SIDEBAR_FIELD.config)).toBeDefined();
	});

	test("needs_auth, pending and disabled rows offer Connect, never Disconnect", () => {
		for (const server of [NEEDS_AUTH, PENDING, DISABLED]) {
			const actions = recorder();
			renderPanel([server], actions, server.name, CONFIG_PATH);
			fireEvent.click(screen.getByRole("button", { name: mcpConnectLabel(server.name) }));
			expect(actions.connected).toEqual([server.name]);
			expect(
				screen.queryByRole("button", { name: mcpDisconnectLabel(server.name) }),
			).toBeNull();
			cleanup();
		}
	});

	test("a connected server's detail offers Disconnect, never Connect", () => {
		const actions = recorder();
		renderPanel([CONNECTED], actions, "srv", CONFIG_PATH);
		fireEvent.click(screen.getByRole("button", { name: mcpDisconnectLabel("srv") }));
		expect(actions.disconnected).toEqual(["srv"]);
		expect(actions.connected).toEqual([]);
		expect(screen.queryByRole("button", { name: mcpConnectLabel("srv") })).toBeNull();
	});

	test("an unresolvable path says so instead of showing a blank", () => {
		const actions = recorder();
		renderPanel([CONNECTED], actions, "srv", null);
		expect(screen.getByText(SIDEBAR_MCP_CONFIG_UNAVAILABLE)).toBeDefined();
	});

	test("an unread path shows no path row yet", () => {
		const actions = recorder();
		renderPanel([CONNECTED], actions, "srv", undefined);
		expect(screen.queryByText(CONFIG_PATH)).toBeNull();
		expect(screen.queryByText(SIDEBAR_MCP_CONFIG_UNAVAILABLE)).toBeNull();
		expect(screen.getByRole("button", { name: mcpDisconnectLabel("srv") })).toBeDefined();
	});
});

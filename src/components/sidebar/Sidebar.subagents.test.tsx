import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { OpenCodeClient, SessionInfo } from "@opencode/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { navigate, sessionRoute } from "@/app/router";
import {
	disposeSidebarBuiltins,
	registerSidebarBuiltins,
} from "@/components/sidebar/builtinPanels";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { subagentInterruptLabel, subagentOpenLabel } from "@/constants/sidebar";
import { resetPanels } from "@/plugins/panels";
import { ClientProvider } from "@/session/ClientProvider";
import { flush } from "@/test/act";
import { openTabIds, resetSettingsState } from "@/test/settings";

/**
 * M2.19's two seams, wired: a Subagents row's **open** goes through the shared
 * `openSessionAndGo` (the child's tab appears in the strip), and a running child's
 * **interrupt** reaches the server — `session.interrupt` — with **that child's**
 * own session id, never the open session's.
 */

const DIRECTORY = "/tmp/m219-subagents";

const SESSION: SessionInfo = {
	id: "ses_root",
	projectID: "proj",
	cost: 0,
	tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
	time: { created: 1, updated: 1 },
	location: { directory: DIRECTORY },
};

/** A child row: no `outcome`, so it is running and offers the interrupt control. */
const CHILD = {
	id: "ses_child",
	parentID: SESSION.id,
	title: "researcher",
	time: { created: 1, updated: 1 },
};

function childClient(onInterrupt: (input: { sessionID: string }) => void): OpenCodeClient {
	return {
		session: {
			get: () => Promise.resolve(SESSION),
			context: () => Promise.resolve([]),
			list: () => Promise.resolve({ data: [CHILD], cursor: {} }),
			interrupt: (input: { sessionID: string }) => {
				onInterrupt(input);
				return Promise.resolve({ interrupted: true });
			},
		},
		mcp: { list: () => Promise.resolve({ location: { directory: DIRECTORY }, data: [] }) },
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

describe("the Subagents panel's actions (M2.19)", () => {
	test("a running child's interrupt reaches the server for that child's id", async () => {
		const calls: Array<{ sessionID: string }> = [];
		renderSidebar(childClient((input) => calls.push(input)));
		const stop = await screen.findByRole("button", {
			name: subagentInterruptLabel("researcher"),
		});
		fireEvent.click(stop);
		expect(calls).toEqual([{ sessionID: CHILD.id }]);
	});

	test("a row opens its child session through the shared seam", async () => {
		renderSidebar(childClient(() => undefined));
		const open = await screen.findByRole("button", { name: subagentOpenLabel("researcher") });
		fireEvent.click(open);
		await flush();
		expect(openTabIds()).toContain(CHILD.id);
	});
});

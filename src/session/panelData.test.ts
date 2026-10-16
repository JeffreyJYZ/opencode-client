import { describe, expect, test } from "bun:test";
import type { McpServer, OpenCodeClient, SessionInfo } from "@opencode/client";
import { loadPanelData } from "@/session/panelData";
import type { SessionRow } from "@/session/useSessions";

/**
 * The figure-vs-API proof at the seam (M2.7): one fake server whose every answer
 * is a shape the pinned client's generated types describe, and the assertion
 * that `loadPanelData` surfaces **that** value for each panel. This is what the
 * browser proof repeats against a real server.
 *
 * The Context figures are asserted against `session.get`'s own `SessionInfo`
 * (M2.15). The fixture must not give `session.stats` and the session the same
 * cost — that coincidence is exactly what hid this defect: the panel printed the
 * server-wide report and the test still passed because the two numbers matched.
 */

const DIRECTORY = "/tmp/m2728-project";

const SESSION: SessionInfo = {
	id: "ses_root",
	projectID: "proj",
	cost: 3.32,
	tokens: { input: 100, output: 20, reasoning: 5, cache: { read: 1_000, write: 0 } },
	time: { created: 1, updated: 2 },
	title: "Chrome work",
	agent: "build",
	model: { id: "gpt-x", providerID: "openai" },
	location: { directory: DIRECTORY },
};

const CHILD = {
	id: "ses_child",
	parentID: "ses_root",
	title: "researcher",
	projectID: "proj",
	cost: 0,
	tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
	time: { created: 1, updated: 1 },
	location: { directory: DIRECTORY },
} as unknown as SessionRow;

const SERVERS: McpServer[] = [
	{ name: "srv", status: { status: "connected" } },
	{ name: "broken", status: { status: "failed", error: "boom" } },
];

const FILES = [
	{ file: `${DIRECTORY}/a.ts`, additions: 12, deletions: 3, status: "modified" as const },
];

function server(branch: string | null): OpenCodeClient {
	return {
		session: {
			get: () => Promise.resolve(SESSION),
			context: () => Promise.resolve([{}, {}]),
			list: () => Promise.resolve({ data: [CHILD], cursor: {} }),
		},
		mcp: { list: () => Promise.resolve({ location: { directory: DIRECTORY }, data: SERVERS }) },
		vcs: {
			status: () => Promise.resolve({ location: { directory: DIRECTORY }, data: FILES }),
			get: () =>
				Promise.resolve({
					location: { directory: DIRECTORY },
					data: { branch: { current: branch ?? undefined } },
				}),
		},
	} as unknown as OpenCodeClient;
}

describe("loadPanelData", () => {
	test("surfaces each panel's figure from its own call", async () => {
		const data = await loadPanelData(server("main"), SESSION.id);
		// Session ← session.get. The branch is a second read (`readBranch`, tested
		// in `vcsBranch.test.ts`) so this load never waits on it.
		expect(data.session.info?.id).toBe(SESSION.id);
		expect(data.session.branch).toBeNull();
		// Context ← session.get (this session's own) + session.context
		expect(data.context.cost).toBe(SESSION.cost);
		expect(data.context.tokens?.input).toBe(SESSION.tokens.input);
		expect(data.context.contextCount).toBe(2);
		// Subagents ← session.list({ parentID })
		expect(data.subagents.children.map((row) => row.id)).toEqual([CHILD.id]);
		// MCP ← mcp.list()
		expect(data.mcp.servers.map((entry) => entry.name)).toEqual(["srv", "broken"]);
		// Files ← vcs.status
		expect(data.files.files).toEqual(FILES);
	});

	test("the Context figures never come from session.stats (a server-wide report)", async () => {
		const client = server("main");
		let statsCalled = false;
		(client.session as { stats: () => Promise<unknown> }).stats = () => {
			statsCalled = true;
			// The measured shape: an aggregate whose cost is many sessions' spend.
			return Promise.resolve({ cost: SESSION.cost * 10, sessions: 72 });
		};
		const data = await loadPanelData(client, SESSION.id);
		expect(statsCalled).toBe(false);
		expect(data.context.cost).toBe(SESSION.cost);
	});

	test("one failing read degrades that figure, not the whole sidebar", async () => {
		const client = server("main");
		(client.session as unknown as { context: () => Promise<unknown> }).context = () =>
			Promise.reject(new Error("offline"));
		const data = await loadPanelData(client, SESSION.id);
		// The context length degrades to zero; the session's own figures remain.
		expect(data.context.contextCount).toBe(0);
		expect(data.context.cost).toBe(SESSION.cost);
		expect(data.session.info?.id).toBe(SESSION.id);
	});

	test("a failed session.get leaves the Context figures empty, never the aggregate", async () => {
		const client = server("main");
		(client.session as unknown as { get: () => Promise<unknown> }).get = () =>
			Promise.reject(new Error("offline"));
		const data = await loadPanelData(client, SESSION.id);
		expect(data.session.info).toBeNull();
		expect(data.context.tokens).toBeNull();
		expect(data.context.cost).toBeNull();
		expect(data.context.contextCount).toBe(2);
	});
});

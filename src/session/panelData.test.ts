import { describe, expect, test } from "bun:test";
import type { McpServer, OpenCodeClient, SessionInfo, SessionStatsInfo } from "@opencode/client";
import { loadPanelData } from "@/session/panelData";
import type { SessionRow } from "@/session/useSessions";

/**
 * The figure-vs-API proof at the seam (M2.7): one fake server whose every answer
 * is a shape the pinned client's generated types describe, and the assertion
 * that `loadPanelData` surfaces **that** value for each panel. This is what the
 * browser proof repeats against a real server.
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

const STATS: SessionStatsInfo = {
	range: { from: 0, to: 1 },
	sessions: 11,
	subagents: 3,
	prompts: 7,
	steps: 13,
	tokens: { input: 111, output: 22, reasoning: 3, cache: { read: 1_111, write: 0 } },
	cost: 3.32,
	tools: { mode: "none" },
	activeDays: 1,
	streak: 1,
	activity: [],
	models: [],
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
			stats: () => Promise.resolve(STATS),
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
		// Context ← session.stats + session.context
		expect(data.context.stats?.prompts).toBe(STATS.prompts);
		expect(data.context.stats?.tokens.input).toBe(STATS.tokens.input);
		expect(data.context.stats?.cost).toBe(STATS.cost);
		expect(data.context.contextCount).toBe(2);
		// Subagents ← session.list({ parentID })
		expect(data.subagents.children.map((row) => row.id)).toEqual([CHILD.id]);
		// MCP ← mcp.list()
		expect(data.mcp.servers.map((entry) => entry.name)).toEqual(["srv", "broken"]);
		// Files ← vcs.status
		expect(data.files.files).toEqual(FILES);
	});

	test("one failing read degrades that figure, not the whole sidebar", async () => {
		const client = server("main");
		(client.session as { stats: () => Promise<unknown> }).stats = () =>
			Promise.reject(new Error("offline"));
		const data = await loadPanelData(client, SESSION.id);
		expect(data.context.stats).toBeNull();
		expect(data.context.contextCount).toBe(2);
		expect(data.session.info?.id).toBe(SESSION.id);
	});
});

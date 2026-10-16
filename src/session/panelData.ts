import type {
	McpServer,
	OpenCodeClient,
	SessionInfo,
	TokenUsageInfo,
	VcsFileStatus,
} from "@opencode/client";
import type { SessionRow } from "@/session/useSessions";

/**
 * The sidebar's five reads (spec 020 §Sidebar, M2.7). One function, one shape:
 * the panel components are pure functions of this and never touch the client, so
 * every figure they render has exactly one producer — the call named here.
 *
 * - **Session** — `session.get`; its `location.directory`. The **branch** is not
 *   read here: `vcs.get` is a second, slower read (a bounded retry) and blocking
 *   the whole sidebar on it would hold every panel empty for seconds. `branch`
 *   starts `null` and `usePanelData` fills it when it resolves.
 * - **Context** — `session.get` (this session's own `tokens` and `cost`, the
 *   same call and fields the statusline reads) and `session.context` (how many
 *   messages are in the window). **Not `session.stats`**: its route
 *   (`GET /api/experimental/session/stats`) has no session in its path and is a
 *   project/server-wide usage report — M2.15 measured its `cost` at ten times one
 *   session's own figure, which is what this panel used to print.
 * - **Subagents** — `session.list({ parentID })`.
 * - **MCP servers** — `mcp.list()`.
 * - **Files changed** — `vcs.status` for the session's directory.
 *
 * Each read is independent: one failing (offline, no repo) degrades to `null`
 * for that figure rather than blanking the whole sidebar.
 */

export type SessionPanelData = {
	readonly info: SessionInfo | null;
	readonly branch: string | null;
};

export type ContextPanelData = {
	/** This session's own token usage — `session.get` → `SessionInfo.tokens`. */
	readonly tokens: TokenUsageInfo | null;
	/** This session's own spend — `session.get` → `SessionInfo.cost`. */
	readonly cost: number | null;
	readonly contextCount: number;
};

export type SubagentsPanelData = { readonly children: readonly SessionRow[] };
export type McpPanelData = { readonly servers: readonly McpServer[] };
export type FilesPanelData = { readonly files: readonly VcsFileStatus[] };

export type PanelData = {
	readonly session: SessionPanelData;
	readonly context: ContextPanelData;
	readonly subagents: SubagentsPanelData;
	readonly mcp: McpPanelData;
	readonly files: FilesPanelData;
};

/** Every figure before a read answers; identity-stable so it is safe as a default. */
export const EMPTY_PANEL_DATA: PanelData = {
	session: { info: null, branch: null },
	context: { tokens: null, cost: null, contextCount: 0 },
	subagents: { children: [] },
	mcp: { servers: [] },
	files: { files: [] },
};

/** Run one read; a failure is `null`, never a throw into the sidebar. */
async function read<T>(call: () => Promise<T>): Promise<T | null> {
	try {
		return await call();
	} catch {
		return null;
	}
}

export async function loadPanelData(client: OpenCodeClient, sessionID: string): Promise<PanelData> {
	const info = await read(() => client.session.get({ sessionID }));
	const directory = info?.location?.directory ?? null;

	const [context, children, mcp, files] = await Promise.all([
		read(() => client.session.context({ sessionID })),
		// The generated list input nests every field behind `limit` (a codegen
		// artifact); the flat query is what the server accepts at runtime.
		read(async () => (await client.session.list({ parentID: sessionID } as never)).data),
		read(async () => (await client.mcp.list()).data),
		directory === null
			? Promise.resolve(null)
			: read(async () => (await client.vcs.status({ location: { directory } })).data),
	]);

	return {
		session: { info, branch: null },
		context: {
			tokens: info?.tokens ?? null,
			cost: info?.cost ?? null,
			contextCount: context?.length ?? 0,
		},
		subagents: { children: children ?? [] },
		mcp: { servers: mcp ?? [] },
		files: { files: files ?? [] },
	};
}

/**
 * The sidebar's vocabulary (spec 020 §Sidebar, M2.7).
 *
 * Panel ids, their titles in spec 020's default order, the region's accessible
 * name, and the empty-state word a panel shows before its read answers — so no
 * component holds a literal.
 */

/** The five panel families spec 020 lists for the sidebar. */
export const SIDEBAR_PANEL = {
	session: "session",
	context: "context",
	subagents: "subagents",
	mcp: "mcp",
	files: "files",
} as const;

export type SidebarPanelID = (typeof SIDEBAR_PANEL)[keyof typeof SIDEBAR_PANEL];

/** Each panel's title, in spec 020's order. */
export const SIDEBAR_PANEL_LABEL = {
	session: "Session",
	context: "Context",
	subagents: "Subagents",
	mcp: "MCP servers",
	files: "Files changed",
} as const;

/**
 * The built-in panels' sort order (M4.11) — spec 020's list, Session first. Named
 * rather than written at each registration, so the built-ins keep their order
 * through the registry the same way a later plugin panel inserts by its
 * neighbours. A panel with no `order` sorts after every ordered one.
 */
export const SIDEBAR_PANEL_ORDER = {
	session: 0,
	context: 1,
	subagents: 2,
	mcp: 3,
	files: 4,
} as const;

/** The label a panel field carries, so a value is never shown unlabelled. */
export const SIDEBAR_FIELD = {
	directory: "Directory",
	branch: "Branch",
	title: "Title",
	agent: "Agent",
	model: "Model",
	updated: "Updated",
	contextMessages: "In context",
	tokensIn: "Tokens in",
	tokensOut: "Tokens out",
	cacheRead: "Cache read",
	spend: "Spend",
	config: "Config",
} as const;

/** The region's accessible name, and the resize handle's. */
export const SIDEBAR_LABEL = "Session sidebar";
export const SIDEBAR_RESIZE_LABEL = "Resize sidebar";

/** What a field shows while its read has not answered, or found nothing. */
export const SIDEBAR_EMPTY = "—";

/** A session with no title of its own (spec 010 §Home's fallback, reused). */
export const SIDEBAR_UNTITLED = "Untitled session";

/** A child session's row or a server's: the columns of one row, joined. */
export const SIDEBAR_ROW_SEPARATOR = " · ";

/** A child session with no `outcome` yet is still running (spec 020 §Subagents). */
export const SIDEBAR_SUBAGENT_ACTIVE = "running";

/** A changed file's diff counts, e.g. `+12 −3`. */
export const SIDEBAR_ADDITIONS_PREFIX = "+";
export const SIDEBAR_DELETIONS_PREFIX = "−";
export const SIDEBAR_DIFF_SEPARATOR = " ";

/**
 * A subagent row's two actions (M2.19, spec 020 §Sidebar: "click to open,
 * interrupt"): the word on each control, and the accessible name it carries — the
 * word, then the child's own label, so two running children are distinguishable
 * and neither control is an anonymous "Open"/"Interrupt".
 */
export const SIDEBAR_SUBAGENT_OPEN = "Open";
export const SIDEBAR_SUBAGENT_INTERRUPT = "Interrupt";

export function subagentOpenLabel(title: string): string {
	return `${SIDEBAR_SUBAGENT_OPEN} ${title}`;
}

export function subagentInterruptLabel(title: string): string {
	return `${SIDEBAR_SUBAGENT_INTERRUPT} ${title}`;
}

/**
 * An MCP row's detail (M2.20, spec 020 §Sidebar: "click opens a detail with
 * connect/disconnect and the config path"): the word on the row's toggle, the
 * word on each action, and the accessible name each control carries — the word,
 * then the server's own name, so two servers are distinguishable and neither
 * control is anonymous. The config field reuses `SIDEBAR_FIELD`, below.
 */
export const SIDEBAR_MCP_DETAILS = "Details";
export const SIDEBAR_MCP_CONNECT = "Connect";
export const SIDEBAR_MCP_DISCONNECT = "Disconnect";

/** The config path is unresolvable — `config.get()` named no document path. */
export const SIDEBAR_MCP_CONFIG_UNAVAILABLE = "Config path unavailable";

export function mcpDetailsLabel(name: string): string {
	return `${SIDEBAR_MCP_DETAILS} ${name}`;
}

export function mcpConnectLabel(name: string): string {
	return `${SIDEBAR_MCP_CONNECT} ${name}`;
}

export function mcpDisconnectLabel(name: string): string {
	return `${SIDEBAR_MCP_DISCONNECT} ${name}`;
}

import type { McpServer } from "@opencode/client";
import { MCP_CONNECTED_STATUS } from "@/constants/mcp";

/**
 * An MCP server is **connected** when the server says so (`McpStatusConnected`,
 * `docs/opencode-api.md` §4) — every other status (`pending`, `disabled`,
 * `failed`, `needs_auth`) is not. It is the guard the panel's action reads: a
 * connected row offers Disconnect, any other row offers Connect (M2.20). Named
 * here rather than written as a literal at each use, so the panel and its slot
 * read the same predicate.
 */
export function isMcpConnected(server: McpServer): boolean {
	return server.status.status === MCP_CONNECTED_STATUS;
}

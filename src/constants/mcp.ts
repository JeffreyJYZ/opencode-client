/**
 * The MCP servers' vocabulary (spec 020 §Sidebar, M2.20).
 *
 * The server's five status words (`McpStatusConnected | McpStatusPending |
 * McpStatusDisabled | McpStatusFailed | McpStatusNeedsAuth`,
 * `docs/opencode-api.md` §4). Only `connected` is named: it is the one the
 * panel's action rule reads (connected → Disconnect, anything else → Connect),
 * and naming it keeps the word in one place instead of a literal at each use.
 */

export const MCP_CONNECTED_STATUS = "connected";

import {
	EMPTY_STYLE,
	FIELD_LABEL_STYLE,
	FIELD_STYLE,
	FIELD_VALUE_STYLE,
	ROW_ACTION_STYLE,
	ROW_DETAIL_STYLE,
	ROW_OPEN_STYLE,
	ROW_STYLE,
} from "@/components/sidebar/sidebarStyles";
import {
	mcpConnectLabel,
	mcpDetailsLabel,
	mcpDisconnectLabel,
	SIDEBAR_EMPTY,
	SIDEBAR_FIELD,
	SIDEBAR_MCP_CONFIG_UNAVAILABLE,
	SIDEBAR_MCP_CONNECT,
	SIDEBAR_MCP_DISCONNECT,
	SIDEBAR_ROW_SEPARATOR,
} from "@/constants/sidebar";
import { isMcpConnected } from "@/session/mcp";
import type { McpPanelData } from "@/session/panelData";

export type McpPanelProps = {
	readonly data: McpPanelData;
	/** The expanded server's own name, or `null` when every row is collapsed. */
	readonly expanded: string | null;
	/** Toggle one row's detail — the slot owns the expanded name, never a client. */
	readonly onToggle: (name: string) => void;
	/** Connect the named server — `connectMcpServer` for **that** server's name. */
	readonly onConnect: (name: string) => void;
	/** Disconnect the named server — `disconnectMcpServer` for **that** name. */
	readonly onDisconnect: (name: string) => void;
	/**
	 * The real `config.get()` document path (`readMcpConfigPath`): `undefined`
	 * while unread, `null` when no document named one. The slot reads it, once.
	 */
	readonly configPath: string | null | undefined;
};

/**
 * The MCP servers panel body (spec 020 §Sidebar, M2.20): `mcp.list()` — name,
 * status word, and its error when the status carries one (`McpStatusFailed` /
 * `McpStatusNeedsAuth`, `docs/opencode-api.md` §4). Each row is a `<button>`
 * that opens an inline detail with the action the status calls for
 * (`isMcpConnected`: connected → Disconnect, anything else → Connect) and the
 * config path. The body stays a pure function of its props — it is handed both
 * actions and the path rather than a client, so mounting it starts no request.
 * The host draws the frame and title (M4.11).
 */

export function McpPanel({
	data,
	expanded,
	onToggle,
	onConnect,
	onDisconnect,
	configPath,
}: McpPanelProps) {
	if (data.servers.length === 0) {
		return <p style={EMPTY_STYLE}>{SIDEBAR_EMPTY}</p>;
	}
	return (
		<>
			{data.servers.map((server) => {
				const error = "error" in server.status ? server.status.error : null;
				const open = expanded === server.name;
				const connected = isMcpConnected(server);
				const actionWord = connected ? SIDEBAR_MCP_DISCONNECT : SIDEBAR_MCP_CONNECT;
				const actionLabel = connected
					? mcpDisconnectLabel(server.name)
					: mcpConnectLabel(server.name);
				const act = connected ? onDisconnect : onConnect;
				return (
					<div key={server.name} style={ROW_STYLE}>
						<button
							type="button"
							className="oc-row"
							style={ROW_OPEN_STYLE}
							aria-label={mcpDetailsLabel(server.name)}
							aria-expanded={open}
							onClick={() => onToggle(server.name)}
						>
							<span>{server.name}</span>
							<span style={ROW_DETAIL_STYLE}>
								{server.status.status}
								{error === null ? null : `${SIDEBAR_ROW_SEPARATOR}${error}`}
							</span>
						</button>
						{open ? (
							<>
								{configPath === undefined ? null : (
									<div style={FIELD_STYLE}>
										<span style={FIELD_LABEL_STYLE}>
											{SIDEBAR_FIELD.config}
										</span>
										<span style={FIELD_VALUE_STYLE}>
											{configPath ?? SIDEBAR_MCP_CONFIG_UNAVAILABLE}
										</span>
									</div>
								)}
								<button
									type="button"
									className="oc-row"
									style={ROW_ACTION_STYLE}
									aria-label={actionLabel}
									onClick={() => act(server.name)}
								>
									{actionWord}
								</button>
							</>
						) : null}
					</div>
				);
			})}
		</>
	);
}

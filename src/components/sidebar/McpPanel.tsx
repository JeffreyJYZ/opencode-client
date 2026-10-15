import { SidebarPanel } from "@/components/sidebar/SidebarPanel";
import { EMPTY_STYLE, ROW_DETAIL_STYLE, ROW_STYLE } from "@/components/sidebar/sidebarStyles";
import { SIDEBAR_EMPTY, SIDEBAR_PANEL_LABEL, SIDEBAR_ROW_SEPARATOR } from "@/constants/sidebar";
import type { McpPanelData } from "@/session/panelData";

/**
 * The MCP servers panel (spec 020 §Sidebar): `mcp.list()` — name, status word,
 * and its error when the status carries one (`McpStatusFailed` /
 * `McpStatusNeedsAuth`, `docs/opencode-api.md` §4). Nothing here connects or
 * disconnects; the panel reports what the server says.
 */

export function McpPanel({ data }: { readonly data: McpPanelData }) {
	return (
		<SidebarPanel title={SIDEBAR_PANEL_LABEL.mcp}>
			{data.servers.length === 0 ? (
				<p style={EMPTY_STYLE}>{SIDEBAR_EMPTY}</p>
			) : (
				data.servers.map((server) => {
					const error = "error" in server.status ? server.status.error : null;
					return (
						<div key={server.name} style={ROW_STYLE}>
							<span>{server.name}</span>
							<span style={ROW_DETAIL_STYLE}>
								{server.status.status}
								{error === null ? null : `${SIDEBAR_ROW_SEPARATOR}${error}`}
							</span>
						</div>
					);
				})
			)}
		</SidebarPanel>
	);
}

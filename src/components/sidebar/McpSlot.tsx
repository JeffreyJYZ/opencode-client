import type { McpServer } from "@opencode/client";
import { useCallback, useState } from "react";
import { McpPanel } from "@/components/sidebar/McpPanel";
import { useSidebarData } from "@/components/sidebar/sidebarData";
import {
	connectMcpServer,
	disconnectMcpServer,
	readMcpConfigPath,
	refreshMcpServers,
} from "@/session/actions";
import { useClient } from "@/session/ClientProvider";

/**
 * The MCP panel's slot (M2.20): the client lives here, never in the pure panel.
 * The slot owns three things the body is handed — the expanded row's name, the
 * config path (read once, on the first expansion, through `readMcpConfigPath`),
 * and a fresher server list after an action (the app ingests no
 * `mcp.status.changed` event, so a connect/disconnect refetches `mcp.list()`
 * through `refreshMcpServers` once the action settles). The fresher list is an
 * override, not the data: when the sidebar's own read answers anew (a session
 * change) the override is dropped.
 */

export function McpSlot() {
	const data = useSidebarData();
	const client = useClient();
	const [expanded, setExpanded] = useState<string | null>(null);
	const [configPath, setConfigPath] = useState<string | null | undefined>(undefined);
	// The list a connect/disconnect refetched, with the list it refreshed: the
	// override holds only while the sidebar's own read still answers that same
	// list, so a session change (a new list identity) drops it without an effect.
	const [fresh, setFresh] = useState<{
		readonly base: readonly McpServer[];
		readonly servers: readonly McpServer[];
	} | null>(null);

	const base = data.mcp.servers;
	const servers = fresh !== null && fresh.base === base ? fresh.servers : base;

	const toggle = useCallback(
		(name: string) => {
			setExpanded((previous) => (previous === name ? null : name));
			if (client !== null && configPath === undefined) {
				void readMcpConfigPath(client).then(setConfigPath);
			}
		},
		[client, configPath],
	);

	const connect = useCallback(
		(name: string) => {
			if (client === null) return;
			void connectMcpServer(client, name).finally(() => {
				void refreshMcpServers(client).then((servers) => setFresh({ base, servers }));
			});
		},
		[client, base],
	);

	const disconnect = useCallback(
		(name: string) => {
			if (client === null) return;
			void disconnectMcpServer(client, name).finally(() => {
				void refreshMcpServers(client).then((servers) => setFresh({ base, servers }));
			});
		},
		[client, base],
	);

	return (
		<McpPanel
			data={{ servers }}
			expanded={expanded}
			onToggle={toggle}
			onConnect={connect}
			onDisconnect={disconnect}
			configPath={configPath}
		/>
	);
}

import { useCallback } from "react";
import { openSessionAndGo } from "@/app/tabSync";
import { ContextPanel } from "@/components/sidebar/ContextPanel";
import { FilesPanel } from "@/components/sidebar/FilesPanel";
import { McpSlot } from "@/components/sidebar/McpSlot";
import { SessionPanel } from "@/components/sidebar/SessionPanel";
import { SubagentsPanel } from "@/components/sidebar/SubagentsPanel";
import { useSidebarData } from "@/components/sidebar/sidebarData";
import { SIDEBAR_PANEL, SIDEBAR_PANEL_LABEL, SIDEBAR_PANEL_ORDER } from "@/constants/sidebar";
import type { Disposable } from "@/plugins/disposable";
import { registerPanel } from "@/plugins/panels";
import { interruptSession } from "@/session/actions";
import { useClient } from "@/session/ClientProvider";

/**
 * The sidebar's built-in panels (M2.7, M4.11): each registers through the same
 * `registerPanel` a plugin's does, so the host renders **one** registry and there
 * is no second, parallel route. A built-in body keeps its pure `{data}` shape
 * (`SessionPanel` …); the thin wrappers here bridge the host's data context to
 * that prop, which is why a body never touches the client.
 *
 * `registerSidebarBuiltins` is called once at boot, beside
 * `registerTopnavBuiltins`; a second call is a no-op, never a duplicate.
 */

function SessionSlot() {
	const data = useSidebarData();
	return <SessionPanel data={data.session} />;
}

function ContextSlot() {
	const data = useSidebarData();
	return <ContextPanel data={data.context} />;
}

function SubagentsSlot() {
	const data = useSidebarData();
	const client = useClient();
	// The panel is handed actions, never a client, so its body stays a pure
	// function of its props and mounting it starts no request (M2.19). Both
	// actions are the app's existing seams.
	const interrupt = useCallback(
		(sessionID: string) => {
			if (client !== null) void interruptSession(client, sessionID);
		},
		[client],
	);
	return (
		<SubagentsPanel
			data={data.subagents}
			openSession={openSessionAndGo}
			interrupt={interrupt}
		/>
	);
}

function FilesSlot() {
	const data = useSidebarData();
	return <FilesPanel data={data.files} />;
}

let installed: Disposable[] | null = null;

/** Register the built-ins once; a second call is a no-op, never a duplicate. */
export function registerSidebarBuiltins(): void {
	if (installed !== null) return;
	installed = [
		registerPanel({
			id: SIDEBAR_PANEL.session,
			title: SIDEBAR_PANEL_LABEL.session,
			component: SessionSlot,
			order: SIDEBAR_PANEL_ORDER.session,
		}),
		registerPanel({
			id: SIDEBAR_PANEL.context,
			title: SIDEBAR_PANEL_LABEL.context,
			component: ContextSlot,
			order: SIDEBAR_PANEL_ORDER.context,
		}),
		registerPanel({
			id: SIDEBAR_PANEL.subagents,
			title: SIDEBAR_PANEL_LABEL.subagents,
			component: SubagentsSlot,
			order: SIDEBAR_PANEL_ORDER.subagents,
		}),
		registerPanel({
			id: SIDEBAR_PANEL.mcp,
			title: SIDEBAR_PANEL_LABEL.mcp,
			component: McpSlot,
			order: SIDEBAR_PANEL_ORDER.mcp,
		}),
		registerPanel({
			id: SIDEBAR_PANEL.files,
			title: SIDEBAR_PANEL_LABEL.files,
			component: FilesSlot,
			order: SIDEBAR_PANEL_ORDER.files,
		}),
	];
}

/** Retract the built-ins. The tests' teardown; production never calls it. */
export function disposeSidebarBuiltins(): void {
	if (installed === null) return;
	for (const disposable of installed.splice(0)) disposable.dispose();
	installed = null;
}

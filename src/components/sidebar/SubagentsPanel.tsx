import { EMPTY_STYLE, ROW_DETAIL_STYLE, ROW_STYLE } from "@/components/sidebar/sidebarStyles";
import {
	SIDEBAR_EMPTY,
	SIDEBAR_ROW_SEPARATOR,
	SIDEBAR_SUBAGENT_ACTIVE,
	SIDEBAR_UNTITLED,
} from "@/constants/sidebar";
import type { SubagentsPanelData } from "@/session/panelData";
import type { SessionRow } from "@/session/useSessions";

/**
 * The Subagents panel body (spec 020 §Sidebar): the open session's children, from
 * `session.list({ parentID })` (`SubagentsPanelData.children`). A child with no
 * `outcome` on its row is still running; the row says so rather than hiding it.
 * The host draws the frame and title (M4.11).
 */

function rowLabel(row: SessionRow): string {
	const title = row.title?.trim();
	return title === undefined || title === "" ? SIDEBAR_UNTITLED : title;
}

function rowState(row: SessionRow): string {
	return row.outcome ?? SIDEBAR_SUBAGENT_ACTIVE;
}

export function SubagentsPanel({ data }: { readonly data: SubagentsPanelData }) {
	return (
		<>
			{data.children.length === 0 ? (
				<p style={EMPTY_STYLE}>{SIDEBAR_EMPTY}</p>
			) : (
				data.children.map((row) => (
					<div key={row.id} style={ROW_STYLE}>
						<span>{rowLabel(row)}</span>
						<span style={ROW_DETAIL_STYLE}>
							{rowState(row)}
							{SIDEBAR_ROW_SEPARATOR}
							{row.id}
						</span>
					</div>
				))
			)}
		</>
	);
}

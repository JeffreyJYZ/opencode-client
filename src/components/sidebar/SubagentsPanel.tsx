import {
	EMPTY_STYLE,
	ROW_DETAIL_STYLE,
	ROW_INTERRUPT_STYLE,
	ROW_OPEN_STYLE,
	ROW_STYLE,
} from "@/components/sidebar/sidebarStyles";
import {
	SIDEBAR_EMPTY,
	SIDEBAR_ROW_SEPARATOR,
	SIDEBAR_SUBAGENT_ACTIVE,
	SIDEBAR_SUBAGENT_INTERRUPT,
	SIDEBAR_UNTITLED,
	subagentInterruptLabel,
	subagentOpenLabel,
} from "@/constants/sidebar";
import type { SubagentsPanelData } from "@/session/panelData";
import { isSubagentRunning } from "@/session/subagents";
import type { SessionRow } from "@/session/useSessions";

/**
 * The Subagents panel body (spec 020 §Sidebar): the open session's children, from
 * `session.list({ parentID })` (`SubagentsPanelData.children`). Each row is **click
 * to open, interrupt** (M2.19): the row is a `<button>` that opens its child in a
 * tab, and a running child offers a second button that interrupts **that** child.
 *
 * A child with no `outcome` on its row is still running (`isSubagentRunning`), and
 * that is the guard: a finished row shows no interrupt affordance. The body stays a
 * pure function of its props — it is handed both actions rather than a client, so
 * mounting it starts no request — and both actions are the app's existing seams
 * (`openSessionAndGo`, `interruptSession`), never a second way to do either. The
 * host draws the frame and title (M4.11).
 */

export type SubagentsPanelProps = {
	readonly data: SubagentsPanelData;
	/** Open the child session in a tab — the shared `openSessionAndGo` seam. */
	readonly openSession: (sessionID: string) => void;
	/** Interrupt the running child — `interruptSession` for **that** child's id. */
	readonly interrupt: (sessionID: string) => void;
};

function rowLabel(row: SessionRow): string {
	const title = row.title?.trim();
	return title === undefined || title === "" ? SIDEBAR_UNTITLED : title;
}

function rowState(row: SessionRow): string {
	return row.outcome ?? SIDEBAR_SUBAGENT_ACTIVE;
}

export function SubagentsPanel({ data, openSession, interrupt }: SubagentsPanelProps) {
	return (
		<>
			{data.children.length === 0 ? (
				<p style={EMPTY_STYLE}>{SIDEBAR_EMPTY}</p>
			) : (
				data.children.map((row) => {
					const label = rowLabel(row);
					return (
						<div key={row.id} style={ROW_STYLE}>
							<button
								type="button"
								className="oc-row"
								style={ROW_OPEN_STYLE}
								aria-label={subagentOpenLabel(label)}
								onClick={() => openSession(row.id)}
							>
								<span>{label}</span>
								<span style={ROW_DETAIL_STYLE}>
									{rowState(row)}
									{SIDEBAR_ROW_SEPARATOR}
									{row.id}
								</span>
							</button>
							{isSubagentRunning(row) ? (
								<button
									type="button"
									className="oc-row"
									style={ROW_INTERRUPT_STYLE}
									aria-label={subagentInterruptLabel(label)}
									onClick={() => interrupt(row.id)}
								>
									{SIDEBAR_SUBAGENT_INTERRUPT}
								</button>
							) : null}
						</div>
					);
				})
			)}
		</>
	);
}

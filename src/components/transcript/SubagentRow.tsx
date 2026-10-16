import { openSessionAndGo } from "@/app/tabSync";
import {
	SUBAGENT_CONTINUATION_MARK,
	SUBAGENT_DETAIL_SEPARATOR,
	SUBAGENT_LABEL,
	SUBAGENT_TITLE_SEPARATOR,
	TOOL_STATUS_LABEL,
} from "@/constants/transcriptUi";
import type { ToolRow } from "@/session/transcript";
import { OutputBlock } from "./OutputBlock";
import {
	isSubagentContinuation,
	subagentAgent,
	subagentDescription,
	subagentModel,
	subagentSession,
} from "./rowModel";
import {
	ACTION_STYLE,
	ANCHOR_STYLE,
	HEAD_STYLE,
	META_STYLE,
	ROW_STYLE,
	rowIdentity,
} from "./rowStyles";

/**
 * A subagent call — the tool family with a child session behind it (M2.1 keeps the
 * child in the tool's input; `packages/core/src/tool/plugin/subagent.ts` is the tool
 * that spawns it). Its own component because the row says something different: not
 * *which file* but *which agent, on what* (spec 020 §Transcript:
 * `<Agent> Subagent — <description> · <model>`, `↳` for a continuation).
 *
 * Every word comes from the input the server sent; a field the input did not
 * carry is left off, never an empty slot. The child id, when the input names
 * one, is a button through the shared `openSessionAndGo` seam (M2.19), so the
 * child opens in a new tab; with no child id there is no click affordance.
 */
export function SubagentRow({ row }: { readonly row: ToolRow }) {
	const agent = subagentAgent(row);
	const description = subagentDescription(row);
	const model = subagentModel(row);
	const child = subagentSession(row);
	return (
		<article {...rowIdentity(row.id)} style={ROW_STYLE}>
			<header style={HEAD_STYLE}>
				{agent !== undefined && <span style={META_STYLE}>{agent}</span>}
				<code style={ANCHOR_STYLE}>{SUBAGENT_LABEL}</code>
				{isSubagentContinuation(row) && (
					<span style={META_STYLE}>{SUBAGENT_CONTINUATION_MARK}</span>
				)}
				{description !== undefined && (
					<span style={META_STYLE}>{`${SUBAGENT_TITLE_SEPARATOR}${description}`}</span>
				)}
				{model !== undefined && (
					<span style={META_STYLE}>{`${SUBAGENT_DETAIL_SEPARATOR}${model}`}</span>
				)}
				{child !== undefined && (
					<button
						type="button"
						style={ACTION_STYLE}
						onClick={() => openSessionAndGo(child)}
					>
						<code style={ANCHOR_STYLE}>{child}</code>
					</button>
				)}
				<span style={META_STYLE} data-status={row.status}>
					{TOOL_STATUS_LABEL[row.status]}
				</span>
			</header>
			<OutputBlock output={row.output} />
		</article>
	);
}

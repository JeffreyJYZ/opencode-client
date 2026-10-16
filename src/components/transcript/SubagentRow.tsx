import { SUBAGENT_LABEL, TOOL_STATUS_LABEL } from "@/constants/transcriptUi";
import type { ToolRow } from "@/session/transcript";
import { OutputBlock } from "./OutputBlock";
import { subagentDetail, subagentSession } from "./rowModel";
import { ANCHOR_STYLE, HEAD_STYLE, META_STYLE, ROW_STYLE, rowIdentity } from "./rowStyles";

/**
 * A subagent call — the tool family with a child session behind it (M2.1 keeps the
 * child in the tool's input; `packages/core/src/tool/plugin/subagent.ts` is the tool
 * that spawns it). Its own component because the row says something different: not
 * *which file* but *which agent, on what*.
 *
 * The subject comes from the input the server sent (description, else agent); until
 * `session.tool.called` lands the input is a partial string, so the row falls back to
 * its kind word and the status carries the rest.
 */
export function SubagentRow({ row }: { readonly row: ToolRow }) {
	const detail = subagentDetail(row);
	const child = subagentSession(row);
	return (
		<article {...rowIdentity(row.id)} style={ROW_STYLE}>
			<header style={HEAD_STYLE}>
				<code style={ANCHOR_STYLE}>{SUBAGENT_LABEL}</code>
				{detail !== undefined && <span style={META_STYLE}>{detail}</span>}
				{child !== undefined && <code style={ANCHOR_STYLE}>{child}</code>}
				<span style={META_STYLE} data-status={row.status}>
					{TOOL_STATUS_LABEL[row.status]}
				</span>
			</header>
			<OutputBlock output={row.output} />
		</article>
	);
}

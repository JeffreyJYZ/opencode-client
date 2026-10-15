import { TOOL_STATUS_LABEL, TOOL_UNNAMED } from "@/constants/transcriptUi";
import type { ToolRow as ToolRowModel } from "@/session/transcript";
import {
	ANCHOR_STYLE,
	HEAD_STYLE,
	META_STYLE,
	OUTPUT_STYLE,
	ROW_STYLE,
	rowIdentity,
} from "./rowStyles";

/**
 * One tool call: what ran, where it anchored, and how it ended.
 *
 * The status is the store's own four values, so it is honest while streaming —
 * `streaming`/`running` are live states, `ok`/`failed` are terminal, and none of
 * them is a spinner that never ends. The anchor is the row's `path` (api §4:
 * `path`, never `filePath`), already extracted by M2.1.
 *
 * The output is plain text inside a `<pre>` — the block M2.4 will cap.
 */
export function ToolRow({ row }: { readonly row: ToolRowModel }) {
	return (
		<article {...rowIdentity(row.id)} style={ROW_STYLE}>
			<header style={HEAD_STYLE}>
				<code style={ANCHOR_STYLE}>{row.name === "" ? TOOL_UNNAMED : row.name}</code>
				{row.anchor !== undefined && <code style={ANCHOR_STYLE}>{row.anchor}</code>}
				<span style={META_STYLE} data-status={row.status}>
					{TOOL_STATUS_LABEL[row.status]}
				</span>
			</header>
			{row.output !== "" && <pre style={OUTPUT_STYLE}>{row.output}</pre>}
		</article>
	);
}

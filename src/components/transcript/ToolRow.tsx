import { TOOL_STATUS_LABEL, TOOL_UNNAMED } from "@/constants/transcriptUi";
import type { ToolRow as ToolRowModel } from "@/session/transcript";
import { OutputBlock } from "./OutputBlock";
import { RowActions } from "./RowActionButtons";
import { rowCopyText, rowEditorTarget } from "./rowCopy";
import { ANCHOR_STYLE, HEAD_STYLE, META_STYLE, ROW_STYLE, rowIdentity } from "./rowStyles";

/**
 * One tool call: what ran, where it anchored, and how it ended.
 *
 * The status is the store's own four values, so it is honest while streaming —
 * `streaming`/`running` are live states, `ok`/`failed` are terminal, and none of
 * them is a spinner that never ends. The anchor is the row's `path` (api §4:
 * `path`, never `filePath`), already extracted by M2.1.
 *
 * The output is the row's capped `Payload`, rendered by the block that owns the
 * render cap and the `(N more lines)` count (M2.4).
 *
 * The head also carries the row's two native affordances (M5.2) — copy its text,
 * open the file it anchored on — both derived from the row by `rowCopy`, so the
 * context menu's items and these buttons can never disagree.
 */
export function ToolRow({ row }: { readonly row: ToolRowModel }) {
	const text = rowCopyText(row);
	const target = rowEditorTarget(row);
	return (
		<article {...rowIdentity(row.id)} style={ROW_STYLE}>
			<header style={HEAD_STYLE}>
				<code style={ANCHOR_STYLE}>{row.name === "" ? TOOL_UNNAMED : row.name}</code>
				{row.anchor !== undefined && <code style={ANCHOR_STYLE}>{row.anchor}</code>}
				<span style={META_STYLE} data-status={row.status}>
					{TOOL_STATUS_LABEL[row.status]}
				</span>
				<RowActions text={text} target={target} />
			</header>
			<OutputBlock output={row.output} />
		</article>
	);
}

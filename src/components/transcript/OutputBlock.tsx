import { useState } from "react";
import { TOOL_CONTENT_MAX_CHARS } from "@/constants/transcript";
import { OUTPUT_COLLAPSE_LABEL } from "@/constants/transcriptUi";
import type { Payload } from "@/session/payloadCaps";
import { IngestElisionNote, PayloadElision } from "./PayloadElision";
import { hiddenLines } from "./rowModel";
import { OUTPUT_STYLE, OUTPUT_TOGGLE_STYLE } from "./rowStyles";

/**
 * A tool's or a shell's output, capped twice over (M2.4).
 *
 * **It does not cap.** The payload it is handed is already the ingest's own head —
 * the one named place that decided what is kept — so this block only *narrows* it
 * to `TOOL_CONTENT_MAX_CHARS` for display and hands the counting to
 * `PayloadElision`, the one seam that draws a trimmed payload's count (M2.3b).
 *
 * Expanding is a view state — the reader's, per block, and gone when the row
 * unmounts — and it reveals the whole **capped** payload, never more: a row that
 * rendered past the ingest cap would make the collapse a lie.
 */
export function OutputBlock({ output }: { readonly output: Payload }) {
	const [expanded, setExpanded] = useState(false);
	if (output.kept === "") return null;
	const collapsed = output.kept.slice(0, TOOL_CONTENT_MAX_CHARS);
	const collapsible = hiddenLines(output, collapsed) > 0 || output.dropped > 0;
	return (
		<>
			<pre style={OUTPUT_STYLE}>{expanded ? output.kept : collapsed}</pre>
			{expanded ? (
				collapsible && (
					<button
						type="button"
						style={OUTPUT_TOGGLE_STYLE}
						onClick={() => setExpanded(false)}
					>
						{OUTPUT_COLLAPSE_LABEL}
					</button>
				)
			) : (
				<PayloadElision
					payload={output}
					shown={collapsed}
					onExpand={() => setExpanded(true)}
				/>
			)}
			{expanded && output.dropped > 0 && <IngestElisionNote />}
		</>
	);
}

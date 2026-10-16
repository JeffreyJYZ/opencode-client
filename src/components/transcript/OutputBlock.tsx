import { useState } from "react";
import { PAYLOAD_ELISION, TOOL_CONTENT_MAX_CHARS } from "@/constants/transcript";
import { MORE_LINES_ATTR, OUTPUT_COLLAPSE_LABEL } from "@/constants/transcriptUi";
import type { Payload } from "@/session/payloadCaps";
import { hiddenLines, moreLinesLabel } from "./rowModel";
import { ELISION_STYLE, OUTPUT_STYLE, OUTPUT_TOGGLE_STYLE } from "./rowStyles";

/**
 * A tool's or a shell's output, capped twice over (M2.4).
 *
 * **It does not cap.** The payload it is handed is already the ingest's own head —
 * the one named place that decided what is kept — so this block only *narrows* it
 * to `TOOL_CONTENT_MAX_CHARS` for display and **counts**: the ingest's own
 * `dropped` plus the lines this render hides. The elision marker is drawn, never
 * part of the counted text, so the count cannot include the marker's own line.
 *
 * Expanding is a view state — the reader's, per block, and gone when the row
 * unmounts — and it reveals the whole **capped** payload, never more: a row that
 * rendered past the ingest cap would make the collapse a lie.
 *
 * `data-more-lines` carries the count into the DOM, so a proof asserts the number
 * rather than reading a sentence.
 */
export function OutputBlock({ output }: { readonly output: Payload }) {
	const [expanded, setExpanded] = useState(false);
	if (output.kept === "") return null;
	const collapsed = output.kept.slice(0, TOOL_CONTENT_MAX_CHARS);
	const hidden = hiddenLines(output, collapsed);
	const more = output.dropped + (expanded ? 0 : hidden);
	const collapsible = hidden > 0 || output.dropped > 0;
	return (
		<>
			<pre style={OUTPUT_STYLE}>{expanded ? output.kept : collapsed}</pre>
			{expanded
				? collapsible && (
						<button
							type="button"
							style={OUTPUT_TOGGLE_STYLE}
							onClick={() => setExpanded(false)}
						>
							{OUTPUT_COLLAPSE_LABEL}
						</button>
					)
				: more > 0 && (
						<button
							type="button"
							style={OUTPUT_TOGGLE_STYLE}
							{...{ [MORE_LINES_ATTR]: String(more) }}
							onClick={() => setExpanded(true)}
						>
							{moreLinesLabel(more)}
						</button>
					)}
			{expanded && output.dropped > 0 && <p style={ELISION_STYLE}>{PAYLOAD_ELISION}</p>}
		</>
	);
}

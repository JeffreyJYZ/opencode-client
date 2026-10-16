import { type CSSProperties, useSyncExternalStore } from "react";
import {
	REASONING_EXPANDED_ATTR,
	REASONING_GROUP_MARK,
	REASONING_GROUP_OPEN_MARK,
} from "@/constants/transcriptUi";
import {
	isReasoningExpanded,
	setReasoningExpanded,
	subscribeReasoningExpansion,
} from "@/session/reasoningExpansion";
import type { TextRow } from "@/session/transcript";
import { IngestElisionNote, PayloadElision } from "./PayloadElision";
import { reasoningSummaryText } from "./reasoningModel";
import { META_STYLE, OUTPUT_TOGGLE_STYLE, ROW_STYLE, rowIdentity } from "./rowStyles";

/**
 * The model's reasoning, as a **collapsed group** (M2.17, spec 020 §Transcript):
 * `+ Thought: <title> · <duration>` that opens to the reasoning text on a click.
 *
 * It is subordinate to prose (spec 030's type scale, not a colour of its own): the
 * summary is in the meta step and the text is italic, so the distinction survives a
 * monochrome theme — the mark and the label word carry the state, never colour.
 *
 * **The group opens while the stream is still running.** Expansion is the reader's
 * own state, remembered by `src/session/reasoningExpansion.ts` (keyed by the
 * session-scoped row id), so it does not wait on the `.ended` frame — and the
 * duration appears only once that frame has landed, because `reasoningSummaryText`
 * prints one only from a measured pair.
 *
 * The text is still prose and still plain: M2.3 owns markdown, M2.4 owns caps.
 * Reasoning is capped on ingest exactly as prose is, so it reports the trim the way
 * `ProseRow` does — through `PayloadElision`, not a second note of its own — and
 * only when it is open, since a collapsed group shows no text to trim.
 */

const REASONING_STYLE: CSSProperties = {
	...ROW_STYLE,
	borderLeft: "var(--oc-hairline) solid var(--oc-border)",
};

const REASONING_TEXT: CSSProperties = {
	...META_STYLE,
	fontStyle: "italic",
};

export function ReasoningRow({ row }: { readonly row: TextRow }) {
	const expanded = useSyncExternalStore(
		subscribeReasoningExpansion,
		() => isReasoningExpanded(row.id),
		() => isReasoningExpanded(row.id),
	);
	const toggle = () => setReasoningExpanded(row.id, !expanded);
	return (
		<article {...rowIdentity(row.id)} style={REASONING_STYLE}>
			<button
				type="button"
				style={OUTPUT_TOGGLE_STYLE}
				aria-expanded={expanded}
				{...{ [REASONING_EXPANDED_ATTR]: String(expanded) }}
				onClick={toggle}
			>
				{expanded ? REASONING_GROUP_OPEN_MARK : REASONING_GROUP_MARK}{" "}
				{reasoningSummaryText(row)}
			</button>
			{expanded && (
				<>
					<p style={REASONING_TEXT}>{row.text.kept}</p>
					<PayloadElision payload={row.text} shown={row.text.kept} />
					{row.text.dropped > 0 && <IngestElisionNote />}
				</>
			)}
		</article>
	);
}

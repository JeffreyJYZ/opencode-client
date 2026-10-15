import type { CSSProperties } from "react";
import { TRANSCRIPT_EMPTY_LABEL, TRANSCRIPT_LABEL } from "@/constants/transcriptUi";
import type { TranscriptRow } from "@/session/transcript";
import { META_STYLE } from "./rowStyles";
import { TranscriptEntry } from "./TranscriptEntry";

/**
 * The transcript: one row per store row, in arrival order (M2.2).
 *
 * **Keyed by the store's own id.** `key={row.id}` is what makes an append an append:
 * React matches the new list against the old by key, so an earlier row is the same
 * element instance and only the row that actually changed re-renders. Nothing here
 * derives an id, numbers a row or re-indexes on append.
 *
 * The list is *not* a scroll container: spec 010 §Desktop behaviours and M2.9 own
 * tail-follow, unpinning and per-tab scroll memory, and the page's own flow scrolls
 * today. Row text already wraps rather than overflowing.
 */

const VIEW_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	width: "100%",
	padding: "var(--oc-space-4) 0",
};

const EMPTY_STYLE: CSSProperties = { ...META_STYLE, textAlign: "center" };

export function TranscriptView({ rows }: { readonly rows: readonly TranscriptRow[] }) {
	return (
		<section aria-label={TRANSCRIPT_LABEL} style={VIEW_STYLE}>
			{rows.length === 0 ? (
				<p style={EMPTY_STYLE}>{TRANSCRIPT_EMPTY_LABEL}</p>
			) : (
				rows.map((row) => <TranscriptEntry key={row.id} row={row} />)
			)}
		</section>
	);
}

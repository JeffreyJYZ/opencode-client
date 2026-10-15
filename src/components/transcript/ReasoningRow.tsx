import type { CSSProperties } from "react";
import { REASONING_LABEL } from "@/constants/transcriptUi";
import type { TextRow } from "@/session/transcript";
import { META_STYLE, ROW_STYLE, rowIdentity } from "./rowStyles";

/**
 * The model's reasoning: subordinate to prose (spec 030's type scale, not a colour
 * of its own). A reader scanning the transcript tells the two apart by **size and
 * a marker**, so the distinction survives a monochrome theme — the label is in the
 * meta step, the text is italic and one step down, and a hairline sets it off.
 *
 * The text is still prose and still plain: M2.3 owns markdown, M2.4 owns caps.
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
	return (
		<article {...rowIdentity(row.id)} style={REASONING_STYLE}>
			<span style={META_STYLE}>{REASONING_LABEL}</span>
			<p style={REASONING_TEXT}>{row.text}</p>
		</article>
	);
}

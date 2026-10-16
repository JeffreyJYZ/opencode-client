import type { TextRow } from "@/session/transcript";
import { Markdown } from "./Markdown";
import { IngestElisionNote, PayloadElision } from "./PayloadElision";
import { HEAD_STYLE, META_STYLE, ROW_STYLE, rowIdentity } from "./rowStyles";

/**
 * Assistant prose: the transcript's primary text, rendered from the server's
 * markdown (M2.3) at the interface size.
 *
 * The parse, the sanitisation and the block layout live in `Markdown`.
 *
 * The row heads itself with its own agent name (M2.32) — the agent only, never
 * the footer's model/duration/rate — in the meta tone one step down. A part
 * whose message carried no agent renders no head: absent, never a placeholder.
 *
 * A prose part over the ingest cap reaches this row **already trimmed**, with the
 * count on its `Payload` (M2.4); the row says so rather than rendering a head as if
 * it were the whole part (M2.3b). The text is shown whole — the store's head is all
 * there is — so the count is a note, never a collapse.
 */
export function ProseRow({ row }: { readonly row: TextRow }) {
	return (
		<article {...rowIdentity(row.id)} style={ROW_STYLE}>
			{row.agent !== undefined && (
				<header style={HEAD_STYLE}>
					<span style={META_STYLE}>{row.agent}</span>
				</header>
			)}
			<Markdown text={row.text.kept} />
			<PayloadElision payload={row.text} shown={row.text.kept} />
			{row.text.dropped > 0 && <IngestElisionNote />}
		</article>
	);
}

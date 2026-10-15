import type { TextRow } from "@/session/transcript";
import { ROW_STYLE, rowIdentity, TEXT_STYLE } from "./rowStyles";

/**
 * Assistant prose: the transcript's primary text, in the interface face at the
 * interface size, with the server's own whitespace kept.
 *
 * Nothing is parsed here — a fence is still plain text until M2.3 owns markdown.
 */
export function ProseRow({ row }: { readonly row: TextRow }) {
	return (
		<article {...rowIdentity(row.id)} style={ROW_STYLE}>
			<p style={TEXT_STYLE}>{row.text}</p>
		</article>
	);
}

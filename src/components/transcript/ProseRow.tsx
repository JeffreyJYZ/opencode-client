import type { TextRow } from "@/session/transcript";
import { Markdown } from "./Markdown";
import { ROW_STYLE, rowIdentity } from "./rowStyles";

/**
 * Assistant prose: the transcript's primary text, rendered from the server's
 * markdown (M2.3) at the interface size.
 *
 * The parse, the sanitisation and the block layout live in `Markdown`.
 */
export function ProseRow({ row }: { readonly row: TextRow }) {
	return (
		<article {...rowIdentity(row.id)} style={ROW_STYLE}>
			<Markdown text={row.text} />
		</article>
	);
}

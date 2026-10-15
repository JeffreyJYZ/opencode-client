import type { FooterRow as FooterRowModel } from "@/session/transcript";
import { footerText } from "./rowModel";
import { META_STYLE, ROW_STYLE, rowIdentity } from "./rowStyles";

/**
 * The per-prompt footer: how the step finished, and what it cost.
 *
 * One row per assistant message, appended once by the store (`<messageID>:f`), so a
 * retried step updates its footer rather than stacking a second one.
 */
export function FooterRow({ row }: { readonly row: FooterRowModel }) {
	return (
		<article {...rowIdentity(row.id)} style={ROW_STYLE}>
			<span style={META_STYLE}>{footerText(row)}</span>
		</article>
	);
}

import type { CSSProperties } from "react";
import type { NoticeRow as NoticeRowModel } from "@/session/transcript";
import { META_STYLE, ROW_STYLE, rowIdentity } from "./rowStyles";

/**
 * A notice the session published: compaction on and off, a staged revert, a retry.
 *
 * The store keeps one row per notice id and updates it in place, so a "Compacting
 * context" line becomes "Context compacted" without a second line appearing.
 */
const NOTICE_STYLE: CSSProperties = { ...ROW_STYLE, alignItems: "center" };

export function NoticeRow({ row }: { readonly row: NoticeRowModel }) {
	return (
		<article {...rowIdentity(row.id)} style={NOTICE_STYLE}>
			<p style={META_STYLE}>{row.text}</p>
		</article>
	);
}

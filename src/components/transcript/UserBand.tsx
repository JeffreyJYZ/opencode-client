import type { CSSProperties } from "react";
import { DELIVERY } from "@/constants/transcript";
import { RAIL_LABEL } from "@/constants/transcriptUi";
import type { UserRow } from "@/session/transcript";
import { META_STYLE, ROW_STYLE, rowIdentity, TEXT_STYLE } from "./rowStyles";

/**
 * The user band: what the human sent, with the rail that says whether it went.
 *
 * **The rail reads the store.** `row.delivery` is the reducer's own value — set to
 * `DELIVERY.queued` by `session.inbox.enqueued` and to `DELIVERY.delivered` by
 * `session.inbox.delivered` — so nothing here decides whether a message was
 * delivered. The tone is a *second* signal beside the word, never the only one: a
 * rail that differed by colour alone would be unreadable to a reader who cannot
 * see it.
 */

const BAND_STYLE: CSSProperties = {
	...ROW_STYLE,
	gap: "var(--oc-space-1)",
	background: "var(--oc-band-surface)",
	borderLeft: "3px solid var(--oc-prompt-rail)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-3) var(--oc-space-4)",
};

const QUEUED_STYLE: CSSProperties = { ...BAND_STYLE, borderLeftColor: "var(--oc-warn)" };
/** Delivered is the resting rail; a queued prompt is the one that stands out. */
const DELIVERED_STYLE: CSSProperties = { ...BAND_STYLE, borderLeftColor: "var(--oc-accent)" };

export function UserBand({ row }: { readonly row: UserRow }) {
	const queued = row.delivery === DELIVERY.queued;
	return (
		<article {...rowIdentity(row.id)} style={queued ? QUEUED_STYLE : DELIVERED_STYLE}>
			<p style={TEXT_STYLE}>{row.text}</p>
			<span style={META_STYLE} data-rail={row.delivery}>
				{queued ? RAIL_LABEL.queued : RAIL_LABEL.delivered}
			</span>
		</article>
	);
}

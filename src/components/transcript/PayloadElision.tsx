import { PAYLOAD_ELISION } from "@/constants/transcript";
import { MORE_LINES_ATTR } from "@/constants/transcriptUi";
import type { Payload } from "@/session/payloadCaps";
import { hiddenLines, moreLinesLabel } from "./rowModel";
import { ELISION_STYLE, META_STYLE, OUTPUT_TOGGLE_STYLE } from "./rowStyles";

/**
 * **The trim, drawn once** (M2.3b): the count a surface is not showing, and the
 * ingest's own note beside it.
 *
 * `shown` is the head the calling surface actually rendered, so the count is the
 * payload's own `dropped` **plus** the lines that head hides — one derivation for
 * a tool block's toggle and a prose row's note, which is what stops the two
 * surfaces from drifting. A surface that renders the whole kept payload passes it
 * as `shown` and adds nothing; a collapsed block passes its render cap's head.
 *
 * `onExpand` is passed only by a surface that has more to reveal. A text row's
 * payload is already whole — the ingest's head is all the store kept — so its
 * count is a **note, never a button that promises an expansion it cannot make**.
 */
export function PayloadElision({
	payload,
	shown,
	onExpand,
}: {
	readonly payload: Payload;
	readonly shown: string;
	readonly onExpand?: () => void;
}) {
	const more = payload.dropped + hiddenLines(payload, shown);
	if (more <= 0) return null;
	const count = { [MORE_LINES_ATTR]: String(more) };
	return onExpand === undefined ? (
		<span style={META_STYLE} {...count}>
			{moreLinesLabel(more)}
		</span>
	) : (
		<button type="button" style={OUTPUT_TOGGLE_STYLE} {...count} onClick={onExpand}>
			{moreLinesLabel(more)}
		</button>
	);
}

/**
 * Where the ingest cut, said the way every surface says it: the marker text is
 * `PAYLOAD_ELISION` and nothing recomposes it, so a tool block and a text row
 * cannot word the same fact differently.
 */
export function IngestElisionNote() {
	return <p style={ELISION_STYLE}>{PAYLOAD_ELISION}</p>;
}

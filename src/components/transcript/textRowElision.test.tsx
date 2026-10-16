import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { NOTICE, PAYLOAD_ELISION, ROW_KIND } from "@/constants/transcript";
import { MORE_LINES_ATTR } from "@/constants/transcriptUi";
import { EMPTY_PAYLOAD, growPayload, lineBreaks, type Payload } from "@/session/payloadCaps";
import type { NoticeRow, TextRow, TranscriptRow } from "@/session/transcript";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);

/**
 * A **text** row over the ingest cap (M2.3b): the count `OutputBlock` used to be the
 * only surface to draw, and the note that says where the ingest cut. Both come
 * through `PayloadElision`, so these are the prose and reasoning halves of M2.4's
 * own assertions in `outputBlock.test.tsx`.
 *
 * Payloads are built by the stream's own function (`growPayload` over deltas), never
 * by a fixture, so a row here is a payload the store can actually hold.
 */

const LINE = "a line of prose\n";
const CHUNK = 4096;

/** The payload a stream of `text` leaves: one `growPayload` per delta, as the ingest does. */
function streamed(text: string): Payload {
	let payload = EMPTY_PAYLOAD;
	for (let at = 0; at < text.length; at += CHUNK) {
		payload = growPayload(payload, text.slice(at, at + CHUNK));
	}
	return payload;
}

function textRow(kind: TextRow["kind"], payload: Payload, id: string): TextRow {
	return { id, created: 1, seq: 1, kind, text: payload, ended: true };
}

const NOTICE_ROW: NoticeRow = {
	id: "notice:compaction",
	created: 2,
	seq: 2,
	kind: ROW_KIND.notice,
	text: NOTICE.compacted,
};

function moreLines(container: HTMLElement): number {
	const node = container.querySelector(`[${MORE_LINES_ATTR}]`);
	if (node === null) throw new Error("the row shows no trimmed count");
	return Number(node.getAttribute(MORE_LINES_ATTR));
}

function transcript(kind: TextRow["kind"], lines: number) {
	const payload = streamed(LINE.repeat(lines));
	const rows: TranscriptRow[] = [textRow(kind, payload, `msg_stream:${kind}`)];
	const { container, rerender } = render(<TranscriptView rows={rows} />);
	return { payload, container, rerender, rows };
}

describe("a text row the ingest trimmed", () => {
	test("prose shows the ingest's count and the note, and no toggle", () => {
		const { payload, container } = transcript(ROW_KIND.prose, 4000);
		expect(payload.dropped).toBeGreaterThan(0);
		expect(moreLines(container)).toBe(payload.dropped);
		expect(moreLines(container)).toBe(lineBreaks(LINE.repeat(4000)) - lineBreaks(payload.kept));
		expect(screen.getByText(PAYLOAD_ELISION)).toBeDefined();
		expect(container.querySelector("button")).toBeNull();
	});

	test("reasoning reports the same fact the same way", () => {
		const { payload, container } = transcript(ROW_KIND.reasoning, 4000);
		expect(moreLines(container)).toBe(payload.dropped);
		expect(screen.getByText(PAYLOAD_ELISION)).toBeDefined();
	});

	test("a payload the ingest kept whole claims nothing", () => {
		const { container } = transcript(ROW_KIND.prose, 10);
		expect(container.querySelector(`[${MORE_LINES_ATTR}]`)).toBeNull();
		expect(screen.queryByText(PAYLOAD_ELISION)).toBeNull();
	});
});

describe("the count is the row's, not the list's", () => {
	test("a later row does not change a trimmed prose row's count", () => {
		const { container, rerender, rows } = transcript(ROW_KIND.prose, 4000);
		const before = moreLines(container);
		rerender(<TranscriptView rows={[...rows, NOTICE_ROW]} />);
		expect(screen.getByText(NOTICE.compacted)).toBeDefined();
		expect(moreLines(container)).toBe(before);
		expect(screen.getAllByText(PAYLOAD_ELISION)).toHaveLength(1);
	});
});

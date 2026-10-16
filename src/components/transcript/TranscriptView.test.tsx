import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { ROW_KIND } from "@/constants/transcript";
import { TRANSCRIPT_EMPTY_LABEL } from "@/constants/transcriptUi";
import { sessionIDOf } from "@/session/eventEnvelope";
import {
	emptyTranscript,
	isTextRow,
	type Transcript,
	type TranscriptRow,
} from "@/session/transcript";
import { reduceTranscript } from "@/session/transcriptReducer";
import { capturedFrames, sessionOfType } from "@/test/capture";

/**
 * The append-stability proof (M2.2), driven by **captured** frames rather than by
 * hand-shaped ones: `m21-stream.jsonl` is a real 2.0.29 stream, and the session
 * below streams its second message's prose in two deltas followed by `.ended`.
 *
 * Stability is proved on a **node reference**: the element found by the row's own
 * `data-row` id before the later frames is compared by identity (`toBe`) with the
 * element found after them. An id comparison alone would also pass if React threw
 * the subtree away and rebuilt it under the same key, so both are asserted: the
 * same id *and* the same node.
 */

afterEach(cleanup);

const frames = await capturedFrames();
/** The one captured session that ran a shell and streamed prose. */
const sessionID = sessionOfType(frames, "session.shell.ended");
const streamed = frames.filter((frame) => sessionIDOf(frame) === sessionID);

/** The transcript after the session's first `count` frames, in arrival order. */
function reduceTo(count: number): Transcript {
	let transcript = emptyTranscript(sessionID);
	for (const frame of streamed.slice(0, count)) {
		transcript = reduceTranscript(transcript, frame) ?? transcript;
	}
	return transcript;
}

/** The index of the session's last frame of `type` — the capture's tail is where it grows. */
function lastOf(type: string): number {
	return streamed.reduce((at, frame, index) => (frame.type === type ? index : at), -1);
}

/** The rendered element for a row, by the store's own id. */
function nodeOf(container: HTMLElement, id: string): HTMLElement | null {
	return container.querySelector(`[data-row="${id}"]`);
}

/** A text row's own text; anything else has none. */
function textOf(row: TranscriptRow | undefined): string {
	return row !== undefined && isTextRow(row) ? row.text.kept : "";
}

/**
 * The row's text as prose renders it (M2.3). This capture's only markdown is
 * inline code, so the shown text is the source with its backticks removed.
 */
function shownText(row: TranscriptRow | undefined): string {
	return textOf(row).replace(/`/g, "").trim();
}

describe("TranscriptView", () => {
	test("a transcript with no rows says so rather than rendering nothing", () => {
		render(<TranscriptView rows={[]} />);
		expect(screen.getByText(TRANSCRIPT_EMPTY_LABEL)).toBeDefined();
	});

	test("every row is keyed by the store's own id, in arrival order", () => {
		const transcript = reduceTo(streamed.length);
		const { container } = render(<TranscriptView rows={transcript.rows} />);
		const rendered = [...container.querySelectorAll("[data-row]")].map((element) =>
			element.getAttribute("data-row"),
		);
		expect(rendered).toEqual(transcript.rows.map((row) => row.id));
	});

	test("a growing part keeps its row and its DOM node across later deltas", () => {
		const started = reduceTo(lastOf("session.text.started") + 1);
		const growing = started.rows.find(
			(row) => row.kind === ROW_KIND.prose && isTextRow(row) && !row.ended,
		);
		if (growing === undefined || !isTextRow(growing)) {
			throw new Error("the capture has no streaming text part");
		}
		// The part has been created but has streamed nothing yet.
		expect(growing.text.kept).toBe("");

		const { container, rerender } = render(<TranscriptView rows={started.rows} />);
		const node = nodeOf(container, growing.id);
		expect(node).not.toBeNull();

		const delta = reduceTo(lastOf("session.text.delta") + 1);
		rerender(<TranscriptView rows={delta.rows} />);
		const grown = delta.rows.find((row) => row.id === growing.id);
		expect(grown).not.toBe(growing);
		expect(nodeOf(container, growing.id)).toBe(node);
		expect(node?.textContent?.trim()).toBe(shownText(grown));

		// `.ended` replaces the text wholesale; the node must survive that too.
		const ended = reduceTo(streamed.length);
		rerender(<TranscriptView rows={ended.rows} />);
		const final = ended.rows.find((row) => row.id === growing.id);
		expect(nodeOf(container, growing.id)).toBe(node);
		expect(node?.textContent?.trim()).toBe(shownText(final));
		expect(final !== undefined && isTextRow(final) && final.ended).toBe(true);
	});

	test("an append does not re-create the rows before it", () => {
		const early = reduceTo(lastOf("session.text.delta") + 1);
		const { container, rerender } = render(<TranscriptView rows={early.rows} />);
		const before = [...container.querySelectorAll("[data-row]")];
		expect(before.length).toBeGreaterThan(0);

		const later = reduceTo(streamed.length);
		expect(later.rows.length).toBeGreaterThan(early.rows.length);
		rerender(<TranscriptView rows={later.rows} />);
		const after = [...container.querySelectorAll("[data-row]")];
		// Same nodes, same order, for every row that existed before the append.
		for (const [index, node] of before.entries()) expect(after[index]).toBe(node);
	});
});

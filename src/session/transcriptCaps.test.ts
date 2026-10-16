import { describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { PAYLOAD_MAX_CHARS, ROW_KIND } from "@/constants/transcript";
import { sessionIDOf } from "@/session/eventEnvelope";
import { lineBreaks } from "@/session/payloadCaps";
import { emptyTranscript, isTextRow, type TextRow, type Transcript } from "@/session/transcript";
import { reduceTranscript } from "@/session/transcriptReducer";
import { capturedFrames, sessionOfType } from "@/test/capture";

/**
 * The cap through the **real reducer** (M2.4 rule 2): a text row that streams,
 * trims at the ingest cap, then **ends** with the whole text.
 *
 * The envelopes are the captured ones — `session.text.*` from
 * `src/test/fixtures/m21-stream.jsonl`, a real 2.0.29 stream — with the `text`/
 * `delta` fields replaced by a payload over the cap. The envelope is therefore
 * captured and the size is **derived**: a capture of a 50 000-character message
 * would only be a 50 000-character fixture, and the frame's own shape is what
 * decides whether the reducer sees it.
 */

const frames = await capturedFrames();
const session = sessionOfType(frames, "session.shell.ended");
const mine = frames.filter((frame) => sessionIDOf(frame) === session);

/** The captured frame of `type` for the streaming message, with a new text body. */
function frameOf(type: string, field: "text" | "delta", body: string): V2Event {
	const frame = mine.find((candidate) => candidate.type === type);
	if (frame === undefined) throw new Error(`the capture has no ${type} frame`);
	return { ...frame, data: { ...frame.data, [field]: body } } as unknown as V2Event;
}

/** A streaming prose run: `started`, a delta over the cap, then the whole text. */
function run(delta: string, full: string): Transcript {
	let transcript = emptyTranscript(session);
	for (const frame of [
		frameOf("session.text.started", "text", ""),
		frameOf("session.text.delta", "delta", delta),
		frameOf("session.text.ended", "text", full),
	]) {
		transcript = reduceTranscript(transcript, frame) ?? transcript;
	}
	return transcript;
}

function proseOf(transcript: Transcript): TextRow {
	const row = transcript.rows.find((candidate) => candidate.kind === ROW_KIND.prose);
	if (row === undefined || !isTextRow(row)) throw new Error("no prose row");
	return row;
}

/** A payload whose lines are known: `count` terminated lines after a long head. */
function payloadOf(count: number, prefix: string): string {
	return `${prefix}${"line\n".repeat(count)}`;
}

describe("a text row that streams, trims, then ends", () => {
	const large = payloadOf(3, "x".repeat(PAYLOAD_MAX_CHARS));

	test("the delta trims at the cap and counts what it dropped", () => {
		const row = proseOf(run(large, large));
		expect(row.text.kept).toHaveLength(PAYLOAD_MAX_CHARS);
		expect(row.text.dropped).toBe(3);
	});

	test("`ended` re-inflates and the count is the truth about the whole text", () => {
		const full = payloadOf(9, "x".repeat(PAYLOAD_MAX_CHARS));
		const row = proseOf(run(large, full));
		expect(row.text.dropped).toBe(9);
		expect(row.text.dropped).toBe(lineBreaks(full) - lineBreaks(row.text.kept));
		expect(row.text.dropped).not.toBe(0);
	});

	test("a shorter authoritative text recomputes the count rather than preserving it", () => {
		const shorter = payloadOf(1, "x".repeat(PAYLOAD_MAX_CHARS));
		const row = proseOf(run(large, shorter));
		expect(row.text.dropped).toBe(1);
	});

	test("the row keeps one payload, so a later delta cannot re-inflate it", () => {
		let transcript = emptyTranscript(session);
		const started = frameOf("session.text.started", "text", "");
		transcript = reduceTranscript(transcript, started) ?? transcript;
		const ended = frameOf(
			"session.text.ended",
			"text",
			payloadOf(4, "x".repeat(PAYLOAD_MAX_CHARS)),
		);
		transcript = reduceTranscript(transcript, ended) ?? transcript;
		const after = reduceTranscript(
			transcript,
			frameOf("session.text.delta", "delta", "more\n"),
		);
		expect(after).toBeNull();
	});
});

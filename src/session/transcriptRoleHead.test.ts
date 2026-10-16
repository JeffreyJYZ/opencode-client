import { describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { ROW_KIND } from "@/constants/transcript";
import { sessionIDOf } from "@/session/eventEnvelope";
import { emptyTranscript, isTextRow, type TextRow, type Transcript } from "@/session/transcript";
import { reduceTranscript } from "@/session/transcriptReducer";
import { capturedFrames, sessionOfType } from "@/test/capture";

/**
 * The prose row's own head (M2.32): each assistant prose row carries its step's
 * agent, read from the step's own start — the same source the footer reads.
 *
 * Every frame is captured (`m21-stream.jsonl`, a real 2.0.29 stream). The text
 * events themselves carry no agent (measured: only `sessionID`,
 * `assistantMessageID`, `ordinal`), so the head must come from the `steps` map
 * the `session.step.started` frame fills — which the stream delivers before the
 * part's frames.
 */

const frames = await capturedFrames();
const session = sessionOfType(frames, "session.shell.ended");

function reduce(events: readonly V2Event[]): Transcript {
	let transcript = emptyTranscript(session);
	for (const event of events) transcript = reduceTranscript(transcript, event) ?? transcript;
	return transcript;
}

function reduceSession(): Transcript {
	return reduce(frames.filter((frame) => sessionIDOf(frame) === session));
}

function textRows(transcript: Transcript): TextRow[] {
	const rows = transcript.rows.filter(isTextRow);
	if (rows.length === 0) throw new Error("the streamed session has no text rows");
	return [...rows];
}

describe("the prose row's own head", () => {
	test("streamed prose rows carry their step's agent", () => {
		const prose = textRows(reduceSession()).filter((row) => row.kind === ROW_KIND.prose);
		expect(prose).toHaveLength(2);
		for (const row of prose) expect(row.agent).toBe("build");
	});

	test("streamed reasoning rows carry the same field", () => {
		const reasoning = textRows(reduceSession()).filter(
			(row) => row.kind === ROW_KIND.reasoning,
		);
		expect(reasoning).toHaveLength(2);
		for (const row of reasoning) expect(row.agent).toBe("build");
	});

	test("a part with no step carries no agent — absent, never a placeholder", () => {
		const started = frames.find((frame) => frame.type === "session.text.started");
		if (started === undefined) throw new Error("the capture has no text run");
		const orphan = {
			...started,
			data: { ...started.data, assistantMessageID: "msg_no_step" },
		} as unknown as V2Event;
		const rows = textRows(reduce([orphan]));
		expect(rows).toHaveLength(1);
		expect(rows[0].agent).toBeUndefined();
		expect("agent" in rows[0]).toBe(false);
	});
});

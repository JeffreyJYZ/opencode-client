import { describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { FINISH_TOOL_CALLS, ROW_KIND } from "@/constants/transcript";
import { sessionIDOf } from "@/session/eventEnvelope";
import { emptyTranscript, type FooterRow, type Transcript } from "@/session/transcript";
import { reduceTranscript } from "@/session/transcriptReducer";
import { capturedFrames, sessionOfType } from "@/test/capture";

/**
 * The per-prompt footer's reducer half (M2.16; spec 020 §Transcript): the step's own
 * frames build it, a `tool-calls` step carries none, and a retried step updates its
 * one footer rather than stacking a second.
 *
 * Every frame is captured (`m21-stream.jsonl`, a real 2.0.29 stream) — the
 * `tool-calls` case is that capture's own `step.ended` with its `finish` derived,
 * because the capture's two steps both ended `stop`.
 */

const frames = await capturedFrames();
const session = sessionOfType(frames, "session.step.ended");
const mine = frames.filter((frame) => sessionIDOf(frame) === session);

function frameOf<T extends V2Event["type"]>(type: T): Extract<V2Event, { type: T }> {
	const frame = mine.find((candidate) => candidate.type === type);
	if (frame === undefined) throw new Error(`the capture has no ${type} frame`);
	return frame as Extract<V2Event, { type: T }>;
}

function reduce(events: readonly V2Event[]): Transcript {
	let transcript = emptyTranscript(session);
	for (const event of events) transcript = reduceTranscript(transcript, event) ?? transcript;
	return transcript;
}

function footers(transcript: Transcript): FooterRow[] {
	return transcript.rows.filter((row) => row.kind === ROW_KIND.footer) as FooterRow[];
}

const started = frameOf("session.step.started");
const ended = frameOf("session.step.ended");

describe("the per-prompt footer's reducer", () => {
	test("a started step paints no row until its end arrives", () => {
		const transcript = reduce([started]);
		expect(footers(transcript)).toHaveLength(0);
		expect(transcript.steps.size).toBe(1);
	});

	test("the ended step's footer is the step's own agent, model, span and tokens", () => {
		const rows = footers(reduce([started, ended]));
		expect(rows).toHaveLength(1);
		// `session.step.started` (1792072635860) → `session.step.ended` (1792072637436).
		expect(rows[0]).toMatchObject({
			id: `${started.data.assistantMessageID}:f`,
			agent: "build",
			model: { id: "cat-jam-free", providerID: "opencode" },
			durationMs: ended.created - started.data.started,
			outputTokens: ended.data.tokens.output,
		});
	});

	test("a `tool-calls` step carries no footer row", () => {
		const toolCalls: typeof ended = {
			...ended,
			data: { ...ended.data, finish: FINISH_TOOL_CALLS },
		};
		const transcript = reduce([started, toolCalls]);
		expect(footers(transcript)).toHaveLength(0);
		expect(transcript.steps.size).toBe(0);
	});

	test("a retried step updates its footer rather than adding one", () => {
		const retried: typeof ended = {
			...ended,
			created: ended.created + 5000,
			data: { ...ended.data, tokens: { ...ended.data.tokens, output: 99 } },
		};
		const rows = footers(reduce([started, ended, started, retried]));
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			durationMs: retried.created - started.data.started,
			outputTokens: 99,
		});
	});
});

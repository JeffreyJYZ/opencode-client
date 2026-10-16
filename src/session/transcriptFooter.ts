import type { V2Event } from "@opencode/client";
import { FINISH_TOOL_CALLS, ROW_KIND } from "@/constants/transcript";
import { createdAtOf, durableSeqOf } from "@/session/eventEnvelope";
import type { FooterRow, StepStart, Transcript } from "@/session/transcript";
import { removeRow, upsertRow } from "@/session/transcriptEdits";

/**
 * The per-prompt footer (M2.16; spec 020 §Transcript: `agent · model · duration ·
 * tok/s`, "printed once per prompt (a `tool-calls` step carries none)").
 *
 * The four fields are the **step's own**, never the session's current identity:
 * `session.step.started` carries the step's `agent`, `model` and its `started`
 * clock, and `session.step.ended` carries the `tokens` the step produced. The two
 * frames are paired by `assistantMessageID`, and the started frame's facts wait in
 * the transcript's `steps` map until the end arrives — so a step that ends by
 * asking for a tool (which carries no footer) never paints a half-footer first.
 *
 * One row per assistant message (`<messageID>:f`), so a retried step updates its
 * footer in place rather than stacking a second. A field the step did not carry is
 * left off the row rather than invented; the line prints only what it has.
 */

export type StepEvent = Extract<
	V2Event,
	{ type: "session.step.started" | "session.step.ended" | "session.step.failed" }
>;

type StepStartedEvent = Extract<V2Event, { type: "session.step.started" }>;
type StepEndedEvent = Extract<V2Event, { type: "session.step.ended" }>;
type StepFailedEvent = Extract<V2Event, { type: "session.step.failed" }>;

/** The footer's row id: one per assistant message, so it is appended once. */
export function footerID(messageID: string): string {
	return `${messageID}:f`;
}

/** Keep a started step's facts, replacing any earlier start for the same message. */
function withStep(transcript: Transcript, id: string, start: StepStart): Transcript {
	const steps = new Map(transcript.steps);
	steps.set(id, start);
	return { ...transcript, steps };
}

/** Drop a step's start once its end has consumed it; no entry is a no-op. */
function withoutStep(transcript: Transcript, id: string): Transcript {
	if (!transcript.steps.has(id)) return transcript;
	const steps = new Map(transcript.steps);
	steps.delete(id);
	return { ...transcript, steps };
}

/** The step's span in milliseconds, from its two clocks. Never negative. */
function durationOf(start: StepStart | undefined, endedAt: number): number | undefined {
	return start === undefined ? undefined : Math.max(0, endedAt - start.started);
}

function footerRow(
	event: StepEvent,
	start: StepStart | undefined,
	outputTokens: number | undefined,
): FooterRow {
	return {
		id: footerID(event.data.assistantMessageID),
		created: createdAtOf(event),
		seq: durableSeqOf(event) ?? 0,
		kind: ROW_KIND.footer,
		agent: start?.agent,
		model: start?.model,
		durationMs: durationOf(start, createdAtOf(event)),
		outputTokens,
	};
}

/** A step began: remember its agent, model and clock for its end (no row yet). */
export function stepStarted(transcript: Transcript, event: StepStartedEvent): Transcript {
	return withStep(transcript, event.data.assistantMessageID, {
		agent: event.data.agent,
		model: event.data.model,
		started: event.data.started,
	});
}

/** A step ended: its footer, or — for `tool-calls` — no footer at all. */
export function stepEnded(transcript: Transcript, event: StepEndedEvent): Transcript {
	const id = footerID(event.data.assistantMessageID);
	const consumed = withoutStep(transcript, event.data.assistantMessageID);
	if (event.data.finish === FINISH_TOOL_CALLS) return removeRow(consumed, id);
	const start = transcript.steps.get(event.data.assistantMessageID);
	return upsertRow(consumed, footerRow(event, start, event.data.tokens.output));
}

/** A step failed: its footer alone; the failure's own row is the reducer's. */
export function stepFailed(transcript: Transcript, event: StepFailedEvent): Transcript {
	const consumed = withoutStep(transcript, event.data.assistantMessageID);
	const start = transcript.steps.get(event.data.assistantMessageID);
	return upsertRow(consumed, footerRow(event, start, event.data.tokens?.output));
}

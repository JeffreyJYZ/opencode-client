import type { V2Event } from "@opencode/client";
import { ROW_KIND } from "@/constants/transcript";
import { createdAtOf, durableSeqOf } from "@/session/eventEnvelope";
import { capPayload, growPayload, type Payload } from "@/session/payloadCaps";
import { isTextRow, type TextRow, type Transcript } from "@/session/transcript";
import { upsertRow } from "@/session/transcriptEdits";

/**
 * The prose and reasoning families (spec 050 §Event ingest: "deltas appended,
 * `.ended` authoritative").
 *
 * **Measured, and it changes the rule**: `data.ordinal` is the **content-part
 * index inside the assistant message, not a delta counter** — in the captured
 * fixture every `session.text.delta` of a message carries `ordinal: 0`, and so does
 * its `session.text.started` (`.superpowers` capture, `src/test/fixtures/
 * m21-stream.jsonl`). A "monotonic ordinal" guard would therefore drop the second
 * real delta of every message. So deltas are **appended in arrival order** and the
 * part is created on demand if a delta arrives before its `.started`; the only
 * thing that can corrupt a row is a delta after `.ended`, which is dropped because
 * the authoritative text has already replaced the run.
 *
 * The cap (M2.4) is the ingest's, not a renderer's: a delta **grows** the payload
 * and carries its count, while `.ended` **replaces** it and recomputes the count
 * from the whole text — which is why a re-inflating authoritative frame can never
 * trip the count back to zero.
 */

export type TextEvent = Extract<
	V2Event,
	{ type: `session.text.${string}` | `session.reasoning.${string}` }
>;

export function isTextEvent(event: V2Event): event is TextEvent {
	return event.type.startsWith("session.text.") || event.type.startsWith("session.reasoning.");
}

/** The row id: one part, one row — the message, the family and the part index. */
function rowID(kind: "prose" | "reasoning", messageID: string, ordinal: number): string {
	const family = kind === ROW_KIND.reasoning ? "r" : "t";
	return `${messageID}:${family}${ordinal}`;
}

function textRow(
	event: TextEvent,
	id: string,
	kind: "prose" | "reasoning",
	text: Payload,
	ended: boolean,
	agent: string | undefined,
): TextRow {
	return {
		id,
		created: createdAtOf(event),
		seq: durableSeqOf(event) ?? 0,
		kind,
		text,
		ended,
		// Absent where the part carried none — never a placeholder (M2.32).
		...(agent === undefined ? {} : { agent }),
	};
}
/**
 * A part's first frame. The text events carry no agent (measured: only
 * `sessionID`, `assistantMessageID`, `ordinal`), so the head is read from the
 * step's own start — the same source the footer reads — which the stream
 * delivers before the part's frames.
 */
function freshTextRow(
	transcript: Transcript,
	event: TextEvent,
	id: string,
	kind: "prose" | "reasoning",
): TextRow {
	return textRow(
		event,
		id,
		kind,
		capPayload(""),
		false,
		transcript.steps.get(event.data.assistantMessageID)?.agent,
	);
}

export function reduceText(transcript: Transcript, event: TextEvent): Transcript | null {
	const kind = event.type.startsWith("session.reasoning.") ? ROW_KIND.reasoning : ROW_KIND.prose;
	const id = rowID(kind, event.data.assistantMessageID, event.data.ordinal);
	const found = transcript.rows.find((row) => row.id === id);
	const existing = found !== undefined && isTextRow(found) ? found : undefined;

	switch (event.type) {
		case "session.text.started":
		case "session.reasoning.started":
			// A repeated `started` keeps the text already streamed.
			return existing === undefined
				? upsertRow(transcript, freshTextRow(transcript, event, id, kind))
				: null;
		case "session.text.delta":
		case "session.reasoning.delta": {
			if (existing?.ended === true) return null;
			const base = existing ?? freshTextRow(transcript, event, id, kind);
			return upsertRow(transcript, {
				...base,
				text: growPayload(base.text, event.data.delta),
			});
		}
		case "session.text.ended":
		case "session.reasoning.ended": {
			const base = existing ?? freshTextRow(transcript, event, id, kind);
			return upsertRow(transcript, {
				...base,
				text: capPayload(event.data.text),
				ended: true,
				// The pair that makes a duration measurable (M2.17): the row's own
				// `created` is the `.started` frame's, and this is the `.ended` frame's.
				endedAt: createdAtOf(event),
			});
		}
		default:
			return null;
	}
}

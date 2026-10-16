import type { SessionMessageAssistant, SessionMessageInfo } from "@opencode/client";
import { DELIVERY, FINISH_TOOL_CALLS, ROW_KIND } from "@/constants/transcript";
import { capPayload, capString } from "@/session/payloadCaps";
import { toolRow } from "@/session/toolRows";
import type { TranscriptRow } from "@/session/transcript";
import { footerID } from "@/session/transcriptFooter";

/**
 * The server's own messages, mapped to the rows M2.2 renders (spec 050 §Event
 * ingest: a refetch **replaces** a transcript's rows, so a repaired transcript and
 * a streamed one must be the same shape).
 *
 * Row ids are derived exactly the way the stream derives them — the message id, the
 * part ordinal **within its family**, the tool call's own id, `:f` for the
 * per-prompt footer — so a row that survives a repair keeps its identity, and
 * re-applying a frame the repair already contains updates a row instead of adding
 * a second one.
 *
 * A repair is an **ingest** too, so every payload here goes through the same cap
 * (`src/session/payloadCaps.ts`) the stream's frames do: a refetch must not
 * re-inflate what the stream trimmed (M2.4).
 */

function assistantRows(message: SessionMessageAssistant): TranscriptRow[] {
	const rows: TranscriptRow[] = [];
	// **Per family, not per content index.** Measured: a captured message's content
	// is `[reasoning, text]` and both stream frames carry `ordinal: 0`, so the
	// ordinal counts within a family.
	let prose = 0;
	let reasoning = 0;
	for (const part of message.content) {
		if (part.type === "tool") {
			rows.push(toolRow(part));
			continue;
		}
		const isReasoning = part.type === "reasoning";
		const ordinal = isReasoning ? reasoning++ : prose++;
		// A reasoning part carries its own `time` pair (`reasoning.started`/`.ended`
		// write it); a text part carries none. The pair is the duration M2.17 shows, so
		// it is read here rather than from the message's own span.
		const partTime = part.type === "reasoning" ? part.time : undefined;
		rows.push({
			id: `${message.id}:${isReasoning ? "r" : "t"}${ordinal}`,
			created: partTime?.created ?? message.time.created,
			seq: 0,
			kind: isReasoning ? ROW_KIND.reasoning : ROW_KIND.prose,
			text: capPayload(part.text),
			// `ended` is "this is the authoritative final text": a message the server
			// has not completed (`time.completed` absent) may still be streaming, so
			// its refetched parts keep accepting deltas.
			ended: message.time.completed !== undefined,
			endedAt: partTime?.completed,
		});
	}
	// The footer is the message's own four fields (M2.16), and a `tool-calls` message
	// carries none — the same guard the stream's `step.ended` applies.
	if (message.finish !== undefined && message.finish !== FINISH_TOOL_CALLS) {
		const completed = message.time.completed;
		rows.push({
			id: footerID(message.id),
			created: completed ?? message.time.created,
			seq: 0,
			kind: ROW_KIND.footer,
			agent: message.agent,
			model: message.model,
			durationMs:
				completed === undefined ? undefined : Math.max(0, completed - message.time.created),
			outputTokens: message.tokens?.output,
		});
	}
	return rows;
}

/** One server message to rows. Kinds with no row here are the stream's alone. */
export function rowsFromMessage(message: SessionMessageInfo): TranscriptRow[] {
	switch (message.type) {
		case "user":
			return [
				{
					id: message.id,
					created: message.time.created,
					seq: 0,
					kind: ROW_KIND.user,
					text: capString(message.text),
					delivery: DELIVERY.delivered,
				},
			];
		case "assistant":
			return assistantRows(message);
		case "shell":
			return [
				{
					id: message.shellID,
					created: message.time.created,
					seq: 0,
					kind: ROW_KIND.shell,
					command: message.command,
					status: message.status,
					output: capPayload(message.output?.output ?? ""),
				},
			];
		default:
			return [];
	}
}

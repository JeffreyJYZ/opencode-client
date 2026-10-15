import type {
	SessionMessageAssistant,
	SessionMessageAssistantTool,
	SessionMessageInfo,
	ToolContent,
} from "@opencode/client";
import { DELIVERY, ROW_KIND, TOOL_ANCHOR_FIELD, TOOL_STATUS } from "@/constants/transcript";
import type { TranscriptRow } from "@/session/transcript";

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
 */

function toolText(content: readonly ToolContent[]): string {
	const parts: string[] = [];
	for (const part of content) if (part.type === "text") parts.push(part.text);
	return parts.join("\n");
}

function toolRow(part: SessionMessageAssistantTool): TranscriptRow {
	const state = part.state;
	const streaming = state.status === "streaming";
	const input = streaming ? state.input : JSON.stringify(state.input);
	const output =
		state.status === "completed"
			? toolText(state.content)
			: state.status === "error"
				? state.error.message
				: "";
	const status =
		state.status === "completed"
			? TOOL_STATUS.ok
			: state.status === "error"
				? TOOL_STATUS.failed
				: state.status === "streaming"
					? TOOL_STATUS.streaming
					: TOOL_STATUS.running;
	const anchor = streaming ? undefined : state.input[TOOL_ANCHOR_FIELD];
	return {
		id: part.id,
		created: part.time.created,
		seq: 0,
		kind: ROW_KIND.tool,
		name: part.name,
		input,
		status,
		output,
		anchor: typeof anchor === "string" ? anchor : undefined,
	};
}

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
		rows.push({
			id: `${message.id}:${isReasoning ? "r" : "t"}${ordinal}`,
			created: message.time.created,
			seq: 0,
			kind: isReasoning ? ROW_KIND.reasoning : ROW_KIND.prose,
			text: part.text,
			// `ended` is "this is the authoritative final text": a message the server
			// has not completed (`time.completed` absent) may still be streaming, so
			// its refetched parts keep accepting deltas.
			ended: message.time.completed !== undefined,
		});
	}
	if (message.finish !== undefined) {
		rows.push({
			id: `${message.id}:f`,
			created: message.time.completed ?? message.time.created,
			seq: 0,
			kind: ROW_KIND.footer,
			finish: message.finish,
			cost: message.cost,
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
					text: message.text,
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
					output: message.output?.output ?? "",
				},
			];
		default:
			return [];
	}
}

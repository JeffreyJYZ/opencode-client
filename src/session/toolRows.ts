import type { SessionMessageAssistantTool, ToolContent } from "@opencode/client";
import { ROW_KIND, TOOL_ANCHOR_FIELD, TOOL_STATUS } from "@/constants/transcript";
import { capInput, capPayload, capString } from "@/session/payloadCaps";
import type { TranscriptRow } from "@/session/transcript";

/**
 * One tool **part** to its row (spec 050 §Event ingest). Split from
 * `transcriptRows.ts` when a merge pushed that file over the 150-line cap: that file
 * maps a whole server message, this one maps a part, and the two are different
 * responsibilities. The anchor rule lives here with the state it reads.
 */

function toolText(content: readonly ToolContent[]): string {
	const parts: string[] = [];
	for (const part of content) if (part.type === "text") parts.push(part.text);
	return parts.join("\n");
}

/** One assistant tool part to its row, capped exactly as the stream's frames are. */
export function toolRow(part: SessionMessageAssistantTool): TranscriptRow {
	const state = part.state;
	const streaming = state.status === "streaming";
	const input = streaming ? capString(state.input) : capInput(state.input);
	const output =
		state.status === "completed"
			? capPayload(toolText(state.content))
			: state.status === "error"
				? capPayload(state.error.message)
				: capPayload("");
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

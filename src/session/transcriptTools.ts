import type { ToolContent1, V2Event } from "@opencode/client";
import { ROW_KIND, TOOL_ANCHOR_FIELD, TOOL_STATUS } from "@/constants/transcript";
import { createdAtOf, durableSeqOf } from "@/session/eventEnvelope";
import type { ToolRow, Transcript } from "@/session/transcript";
import { upsertRow } from "@/session/transcriptEdits";

/**
 * The tool family (spec 050 §Event ingest: "tool rows: name, anchor, status, output").
 *
 * One frame per fact, not one frame per row: `input.started` names the call,
 * `input.delta`/`input.ended` carry the input text, `called` carries the input
 * object, `success`/`failed` carry the output. All of them are keyed by the tool
 * call's own `id`, so every patch merges into the row the first frame created —
 * which is also what makes a replayed frame idempotent.
 *
 * A **subagent** row is this row: the child session rides in the tool's input
 * (spec 050 §Sessions lists `session.list({ parentID })` for a subagent list), so
 * M2.2 decides the row's label from `(name, input)` and the store keeps them whole.
 */

export type ToolEvent = Extract<V2Event, { type: `session.tool.${string}` }>;

export function isToolEvent(event: V2Event): event is ToolEvent {
	return event.type.startsWith("session.tool.");
}

type ToolPatch = {
	readonly name?: string;
	readonly input?: string;
	readonly status?: ToolRow["status"];
	readonly output?: string;
	readonly anchor?: string;
};

/** Merge a patch into the row for `id`, creating it with defaults when it is new. */
function merge(transcript: Transcript, event: ToolEvent, id: string, patch: ToolPatch): Transcript {
	const found = transcript.rows.find((row) => row.id === id);
	const previous = found?.kind === ROW_KIND.tool ? found : undefined;
	const row: ToolRow = {
		id,
		created: previous?.created ?? createdAtOf(event),
		// A frame that carries no `durable` (input delta, progress) must not erase
		// the provenance the durable frames set.
		seq: durableSeqOf(event) ?? previous?.seq ?? 0,
		kind: ROW_KIND.tool,
		name: patch.name ?? previous?.name ?? "",
		input: patch.input ?? previous?.input ?? "",
		status: patch.status ?? previous?.status ?? TOOL_STATUS.running,
		output: patch.output ?? previous?.output ?? "",
		anchor: patch.anchor ?? previous?.anchor,
	};
	return upsertRow(transcript, row);
}

/** A tool's text output; `Tool.Content` has no diff part, so a file part is skipped. */
function toolText(content: readonly ToolContent1[]): string {
	const parts: string[] = [];
	for (const part of content) if (part.type === "text") parts.push(part.text);
	return parts.join("\n");
}

/** The row's anchor: `path`, never `filePath` (api §4). */
function anchorOf(input: { readonly [key: string]: unknown }): string | undefined {
	const value = input[TOOL_ANCHOR_FIELD];
	return typeof value === "string" ? value : undefined;
}

function toolInput(transcript: Transcript, id: string): string {
	const found = transcript.rows.find((row) => row.id === id);
	return found?.kind === ROW_KIND.tool ? found.input : "";
}

export function reduceTool(transcript: Transcript, event: ToolEvent): Transcript | null {
	switch (event.type) {
		case "session.tool.input.started":
			return merge(transcript, event, event.data.id, { name: event.data.name });
		case "session.tool.input.delta":
			return merge(transcript, event, event.data.id, {
				input: `${toolInput(transcript, event.data.id)}${event.data.delta}`,
			});
		case "session.tool.input.ended":
			return merge(transcript, event, event.data.id, { input: event.data.text });
		case "session.tool.called":
			return merge(transcript, event, event.data.id, {
				input: JSON.stringify(event.data.input),
				anchor: anchorOf(event.data.input),
			});
		case "session.tool.success":
			return merge(transcript, event, event.data.id, {
				status: TOOL_STATUS.ok,
				output: toolText(event.data.content),
			});
		case "session.tool.failed":
			return merge(transcript, event, event.data.id, {
				status: TOOL_STATUS.failed,
				output: event.data.error.message,
			});
		case "session.tool.progress":
			// The frame is a progress *hint* with no row of its own; M2.4 renders it.
			return null;
		default:
			return null;
	}
}

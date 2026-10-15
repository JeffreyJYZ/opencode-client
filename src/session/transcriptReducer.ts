import type { V2Event } from "@opencode/client";
import { DELIVERY, NOTICE, ROW_KIND } from "@/constants/transcript";
import { createdAtOf, durableSeqOf } from "@/session/eventEnvelope";
import type { ShellRow, Transcript, TranscriptRow } from "@/session/transcript";
import { appendRow, removeRow, replaceRow, setRunning, upsertRow } from "@/session/transcriptEdits";
import { isTextEvent, reduceText } from "@/session/transcriptText";
import { isToolEvent, reduceTool } from "@/session/transcriptTools";

/**
 * One frame to one transcript change (spec 050 §Event ingest's event table).
 *
 * Pure and total: `null` means "this frame produces nothing here" — a type another
 * row owns (permissions and forms are M2.6's dock, `mcp.*` and `vcs.*` carry no
 * session, `session.message.content.updated` would re-send a whole message that the
 * deltas and their authoritative `.ended` already carry, usage is M2.7's panel).
 * The store owns the ingest rules — held session, duplicate id, stale `durable.seq`
 * — so this module only ever sees a frame that passed all three.
 *
 * The two streamed families are split out along their own seam: prose/reasoning
 * rows (`transcriptText.ts`) and tool rows (`transcriptTools.ts`).
 */

/** Compaction and revert each own one notice row per session, updated in place. */
const COMPACTION_NOTICE_ID = "notice:compaction";
const REVERT_NOTICE_ID = "notice:revert";

/** The per-prompt footer's id: one per assistant message, so it is appended once. */
function footerID(messageID: string): string {
	return `${messageID}:f`;
}

function rowBase(event: V2Event, id: string): { id: string; created: number; seq: number } {
	return { id, created: createdAtOf(event), seq: durableSeqOf(event) ?? 0 };
}

function noticeRow(event: V2Event, id: string, text: string): TranscriptRow {
	return { ...rowBase(event, id), kind: ROW_KIND.notice, text };
}

function errorRow(event: V2Event, message: string): TranscriptRow {
	return { ...rowBase(event, `error:${event.id}`), kind: ROW_KIND.error, message };
}

/** The shell family's two frames; both carry the same `shell` object. */
type ShellEvent = Extract<V2Event, { type: "session.shell.started" | "session.shell.ended" }>;

function shellRow(event: ShellEvent, output: string): ShellRow {
	const shell = event.data.shell;
	return {
		...rowBase(event, shell.id),
		kind: ROW_KIND.shell,
		command: shell.command,
		status: shell.status,
		output,
	};
}

export function reduceTranscript(transcript: Transcript, event: V2Event): Transcript | null {
	if (isTextEvent(event)) return reduceText(transcript, event);
	if (isToolEvent(event)) return reduceTool(transcript, event);
	switch (event.type) {
		case "session.execution.started":
			return setRunning(transcript, true);
		case "session.execution.succeeded":
		case "session.execution.interrupted":
		case "session.idle":
			return setRunning(transcript, false);
		case "session.execution.failed":
			return appendRow(
				setRunning(transcript, false),
				errorRow(event, event.data.error.message),
			);
		case "session.inbox.enqueued": {
			if (event.data.item.type !== "user") return null;
			return upsertRow(transcript, {
				...rowBase(event, event.data.inboxID),
				kind: ROW_KIND.user,
				text: event.data.item.payload.text,
				delivery: DELIVERY.queued,
			});
		}
		case "session.inbox.delivered":
			return replaceRow(transcript, event.data.inboxID, (row) =>
				row.kind === ROW_KIND.user ? { ...row, delivery: DELIVERY.delivered } : row,
			);
		case "session.inbox.cancelled":
			return removeRow(transcript, event.data.inboxID);
		case "session.shell.started":
			return upsertRow(transcript, shellRow(event, ""));
		case "session.shell.ended":
			// `output` is a paged object: the row stores `output.output`, never the pages.
			return upsertRow(transcript, shellRow(event, event.data.output.output));
		case "session.step.ended":
			return upsertRow(transcript, {
				...rowBase(event, footerID(event.data.assistantMessageID)),
				kind: ROW_KIND.footer,
				finish: event.data.finish,
				cost: event.data.cost,
			});
		case "session.step.failed":
			return appendRow(
				upsertRow(transcript, {
					...rowBase(event, footerID(event.data.assistantMessageID)),
					kind: ROW_KIND.footer,
					finish: event.data.finish ?? "error",
				}),
				errorRow(event, event.data.error.message),
			);
		case "session.retry.scheduled":
			return appendRow(
				transcript,
				noticeRow(
					event,
					`retry:${event.data.assistantMessageID}:${event.data.attempt}`,
					NOTICE.retrying,
				),
			);
		case "session.compaction.started":
			return upsertRow(transcript, noticeRow(event, COMPACTION_NOTICE_ID, NOTICE.compacting));
		case "session.compaction.ended":
			return upsertRow(transcript, noticeRow(event, COMPACTION_NOTICE_ID, NOTICE.compacted));
		case "session.compaction.failed":
			return upsertRow(
				transcript,
				noticeRow(event, COMPACTION_NOTICE_ID, NOTICE.compactionFailed),
			);
		case "session.revert.staged":
			return upsertRow(transcript, noticeRow(event, REVERT_NOTICE_ID, NOTICE.revertStaged));
		case "session.revert.cleared":
			return removeRow(transcript, REVERT_NOTICE_ID);
		case "session.revert.committed":
			return upsertRow(
				transcript,
				noticeRow(event, REVERT_NOTICE_ID, NOTICE.revertCommitted),
			);
		default:
			return null;
	}
}

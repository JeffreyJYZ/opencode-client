import type { OpenCodeClient, SessionInboxInfo, SessionMessageInfo } from "@opencode/client";
import { DELIVERY, MESSAGE_PAGE_LIMIT, ROW_KIND } from "@/constants/transcript";
import { capString } from "@/session/payloadCaps";
import type { TranscriptRow } from "@/session/transcript";
import { rowsFromMessage } from "@/session/transcriptRows";

/**
 * Gap repair's server calls (spec 050 §Event ingest: "gaps are repaired by
 * **refetch**, never by replay"; `docs/opencode-api.md` §3: `message.list`). The
 * mapping to rows is `transcriptRows.ts`.
 *
 * The page is the **newest** messages, reversed into chronological order: a live
 * view needs its tail, and that window is all a repair claims to restore — nothing
 * back-fills the head of a transcript. A failed
 * call returns `null` and changes nothing — the connection state owns the failure,
 * and an empty transcript is never the answer to "the refetch did not work".
 *
 * A session opened while a prompt is still queued needs the same row the live
 * `session.inbox.enqueued` frame would have built: `message.list` stays empty
 * until delivery (api §3: seeding without a model), so the tail below is the
 * pending inbox, one queued user row per pending user entry. The row id **is**
 * the inbox id, the same identity the live path uses — the later `delivered`
 * frame updates the row instead of adding a second one. The inbox table is
 * pending-only server-side (delivery and cancel delete the row, never mark it),
 * so everything listed is still waiting; non-user entries are the live path's
 * alone, exactly as the reducer treats them.
 */

/** The refetched rows for one session, or `null` when the call failed. */
export async function refetchTranscript(
	client: OpenCodeClient,
	sessionID: string,
): Promise<readonly TranscriptRow[] | null> {
	try {
		const query = { sessionID, order: "desc", limit: MESSAGE_PAGE_LIMIT } as unknown;
		const page = (await client.message.list(query as never)) as {
			data?: readonly SessionMessageInfo[];
		};
		const rows: TranscriptRow[] = [];
		for (const message of (page.data ?? []).slice().reverse()) {
			rows.push(...rowsFromMessage(message));
		}
		rows.push(...(await queuedInboxRows(client, sessionID, rows)));
		return rows;
	} catch {
		return null;
	}
}

/**
 * One queued user row per pending inbox entry, in the server's enqueue order.
 * A failed inbox read keeps the message rows rather than failing the whole
 * refetch — the messages are the transcript, the queue is its tail.
 */
async function queuedInboxRows(
	client: OpenCodeClient,
	sessionID: string,
	rows: readonly TranscriptRow[],
): Promise<TranscriptRow[]> {
	try {
		const entries = (await client.session.inbox.list({
			sessionID,
		})) as readonly SessionInboxInfo[];
		const seen = new Set(rows.map((row) => row.id));
		const queued: TranscriptRow[] = [];
		for (const entry of entries) {
			// The live path's own guard (`transcriptReducer.ts`): only a user prompt
			// is a user row. The id guard is the no-double: a delivered message and
			// its inbox entry never coexist, but an overlap must update, not append.
			if (entry.type !== "user" || seen.has(entry.id)) continue;
			seen.add(entry.id);
			queued.push({
				id: entry.id,
				created: entry.time.created,
				seq: 0,
				kind: ROW_KIND.user,
				text: capString(entry.payload.text),
				delivery: DELIVERY.queued,
			});
		}
		return queued;
	} catch {
		return [];
	}
}

import type { OpenCodeClient, SessionMessageInfo } from "@opencode/client";
import { MESSAGE_PAGE_LIMIT } from "@/constants/transcript";
import type { TranscriptRow } from "@/session/transcript";
import { rowsFromMessage } from "@/session/transcriptRows";

/**
 * Gap repair's server call (spec 050 §Event ingest: "gaps are repaired by
 * **refetch**, never by replay"; `docs/opencode-api.md` §3: `message.list`). The
 * mapping to rows is `transcriptRows.ts`.
 *
 * The page is the **newest** messages, reversed into chronological order: a live
 * view needs its tail, and that window is all a repair claims to restore — nothing
 * back-fills the head of a transcript. A failed
 * call returns `null` and changes nothing — the connection state owns the failure,
 * and an empty transcript is never the answer to "the refetch did not work".
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
		return rows;
	} catch {
		return null;
	}
}

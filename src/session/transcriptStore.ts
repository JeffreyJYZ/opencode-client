import type { V2Event } from "@opencode/client";
import { INGEST_OUTCOME, type IngestOutcome } from "@/constants/transcript";
import { durableSeqOf, sessionIDOf } from "@/session/eventEnvelope";
import { emptyTranscript, type Transcript, type TranscriptRow } from "@/session/transcript";
import { remember } from "@/session/transcriptEdits";
import { reduceTranscript } from "@/session/transcriptReducer";

/**
 * The store the stream feeds (spec 050 §Event ingest): **a map `sessionID →
 * Transcript`**, the app's whole transcript state.
 *
 * It holds a transcript only for sessions the app has **opened as a tab** — that is
 * what "the sessions this app cares about" means, and it is the same set the strip
 * renders. A frame for any other session is refused here, before a handler runs,
 * which is what makes one subscription for every session on the server affordable.
 *
 * The three ingest rules live here rather than in the reducer, because they are
 * facts about *frames*, not about rows:
 *
 * - **Dedupe by event id.** Every frame carries one; a repeat is dropped.
 * - **Stale by `durable.seq`.** Measured from the captured fixture: `aggregateID` is
 *   the session and `seq` rises across all its durable frames, so one watermark per
 *   transcript rejects an out-of-order or replayed durable frame. Volatile frames
 *   (deltas, `session.status`) carry no `seq` and are ordered by arrival.
 * - **Never replay.** `resync` replaces the rows and resets the watermark and the id
 *   memory, so a repaired transcript is the server's own state and the next frame
 *   cannot re-apply something the repair already contains.
 */

export type TranscriptStore = {
	/** The held transcript, or `undefined` when the app does not hold this session. */
	get: (sessionID: string) => Transcript | undefined;
	/** Hold a session: from here its frames reduce and its gaps are repaired. */
	hold: (sessionID: string) => Transcript;
	release: (sessionID: string) => void;
	held: () => readonly string[];
	ingest: (event: V2Event) => IngestOutcome;
	/** Replace a transcript's rows with a refetch's. Never a replay. */
	resync: (sessionID: string, rows: readonly TranscriptRow[]) => void;
	subscribe: (listener: () => void) => () => void;
};

export function createTranscriptStore(): TranscriptStore {
	const held = new Map<string, Transcript>();
	const listeners = new Set<() => void>();

	function notify(): void {
		for (const listener of [...listeners]) listener();
	}

	function get(sessionID: string): Transcript | undefined {
		return held.get(sessionID);
	}

	function hold(sessionID: string): Transcript {
		const existing = held.get(sessionID);
		if (existing !== undefined) return existing;
		const created = emptyTranscript(sessionID);
		held.set(sessionID, created);
		notify();
		return created;
	}

	function release(sessionID: string): void {
		if (held.delete(sessionID)) notify();
	}

	function heldIDs(): readonly string[] {
		return [...held.keys()];
	}

	function ingest(event: V2Event): IngestOutcome {
		const sessionID = sessionIDOf(event);
		// No session: `mcp.*`, `vcs.*`, the transport frames — M2.7/M2.8's surfaces.
		if (sessionID === undefined) return INGEST_OUTCOME.ignored;
		const current = held.get(sessionID);
		// A session this app has never opened: refused, not buffered. Opening it
		// later starts from a refetch.
		if (current === undefined) return INGEST_OUTCOME.refused;
		if (event.type === "session.deleted") {
			release(sessionID);
			return INGEST_OUTCOME.reduced;
		}
		if (current.seen.has(event.id)) return INGEST_OUTCOME.duplicate;
		const seq = durableSeqOf(event);
		if (seq !== null && seq <= current.lastSeq) return INGEST_OUTCOME.duplicate;
		const next = reduceTranscript(current, event);
		if (next === null) return INGEST_OUTCOME.ignored;
		held.set(sessionID, remember(next, event.id, seq));
		notify();
		return INGEST_OUTCOME.reduced;
	}

	function resync(sessionID: string, rows: readonly TranscriptRow[]): void {
		const current = held.get(sessionID);
		if (current === undefined) return;
		held.set(sessionID, { ...current, rows, lastSeq: -1, seen: new Set() });
		notify();
	}

	function subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}

	return { get, hold, release, held: heldIDs, ingest, resync, subscribe };
}

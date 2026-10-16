import type { V2Event } from "@opencode/client";
import { type DockSignals, dockSessionIDOf } from "@/session/dockSignal";
import type { TranscriptStore } from "@/session/transcriptStore";

/**
 * The ingest's one line of dock business (M2.6): a permission/form frame is the
 * docks' cue to refetch, and it is **not** a transcript row.
 *
 * Two things a frame for these families needs that a transcript frame does not:
 *
 * - its session is read from the frame's **own** shape (`dockSessionIDOf`), because
 *   `form.created` nests it at `data.form.sessionID`; and
 * - only a session the app **holds** may be cued, so a frame for a session with no
 *   tab ticks nothing (the same boundary the transcript store enforces).
 *
 * Kept out of `sessionIngest.ts` so that file stays about the subscription's
 * lifetime and the accept filter, and this about one cue.
 */
export function cueDock(
	event: V2Event,
	transcripts: TranscriptStore,
	signals: DockSignals | undefined,
): void {
	if (signals === undefined) return;
	const sessionID = dockSessionIDOf(event);
	if (sessionID === undefined || transcripts.get(sessionID) === undefined) return;
	signals.ingest(sessionID);
}

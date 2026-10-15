import { useSyncExternalStore } from "react";
import { useTranscripts } from "@/session/ClientProvider";
import type { Transcript } from "@/session/transcript";

/**
 * The open session's transcript (spec 050 §Event ingest: "the open session's
 * transcript exposed by the hook").
 *
 * Read-only on purpose: the **tab store** is the one holder (see
 * `src/app/ingestHooks.ts`), so mounting a view cannot make the ingest accept a
 * session the strip does not show, and unmounting one cannot release a transcript
 * another holder still needs. A session with no tab open has no transcript.
 *
 * A snapshot is the transcript object itself, replaced only by an edit, so an
 * unchanged transcript keeps its identity and M2.2's memoised row list settles.
 */

export function useTranscript(sessionID: string): Transcript | undefined {
	const store = useTranscripts();
	return useSyncExternalStore(store.subscribe, () => store.get(sessionID));
}

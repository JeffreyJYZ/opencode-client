import { useSyncExternalStore } from "react";
import type { ActivitySink } from "@/session/ingestEffects";

/**
 * Which sessions are running, for the strip's status dots and the offline
 * transition (spec 050 §Event ingest: "`session.execution.*` — the session's
 * running flag; gates `esc interrupt`, the statusline hint, the tab dot").
 *
 * **M2.1 deleted the five-second `session.active()` poll that used to live here.**
 * The set is fed by the event ingest now: `session.execution.started` **and** its
 * `succeeded` / `failed` / `interrupted` counterparts (plus `session.idle`) set it
 * per frame, and `session.active()` is read **once** per live transition, to
 * hydrate what was already running before this app connected.
 *
 * The failure mode if the replacement were missing: the dots never change at all —
 * every open session reads idle, so "running" is invisible and an interrupt cannot
 * be gated on it. (A set fed only `started` would be the other half of the same
 * bug: a session that finished keeps its dot lit forever.)
 */

const EMPTY_SET: ReadonlySet<string> = new Set();
let running: ReadonlySet<string> = EMPTY_SET;
const listeners = new Set<() => void>();

function publish(next: ReadonlySet<string>): void {
	running = next;
	for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getActivitySnapshot(): ReadonlySet<string> {
	return running;
}

/** An execution frame's effect on one session's dot. */
export function setSessionRunning(sessionID: string, isRunning: boolean): void {
	const present = running.has(sessionID);
	if (present === isRunning) return;
	const next = new Set(running);
	if (isRunning) next.add(sessionID);
	else next.delete(sessionID);
	publish(next);
}

/** The already-running ids, read once per live transition. Unchanged keeps the snapshot. */
export function hydrateRunning(ids: readonly string[]): void {
	if (ids.length === running.size && ids.every((id) => running.has(id))) return;
	publish(new Set(ids));
}

/** The running ids now, straight from the store the ingest writes. */
export function useSessionActivity(): ReadonlySet<string> {
	return useSyncExternalStore(subscribe, getActivitySnapshot);
}

/** The ingest's seam into this store (spec 050 §Event ingest). */
export const ACTIVITY: ActivitySink = {
	setRunning: setSessionRunning,
	hydrate: hydrateRunning,
	clear: resetActivity,
};

/** Clear the set: a target change, a dropped stream, or the tests' reset. */
export function resetActivity(): void {
	if (running.size === 0) return;
	publish(EMPTY_SET);
}

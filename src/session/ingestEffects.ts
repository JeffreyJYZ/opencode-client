import type { V2Event } from "@opencode/client";
import { sessionIDOf } from "@/session/eventEnvelope";

/**
 * What one accepted frame does to the two surfaces that are **not** the transcript
 * (spec 050 §Event ingest): the strip's activity dot, which replaces M1.1's
 * five-second `session.active()` poll, and the unread pip on a background tab,
 * whose seam `src/app/tabs.ts` already named for M2.1.
 *
 * The **failure mode if the dot's replacement were missing**: the dot never
 * changes at all — every open session reads idle, so "running" is invisible and an
 * interrupt cannot be gated on the session's execution state. The other half of
 * that bug is a set fed only `started`: a session that finished keeps its dot lit
 * forever, so all four ends are here, not just the start.
 */

/** The server's own liveness frame; the client replays it to every new subscriber. */
export const SERVER_CONNECTED_EVENT = "server.connected";

/** The execution family, per frame. `session.idle` is the same clear by another name. */
const EXECUTION_RUNNING: Readonly<Record<string, boolean>> = {
	"session.execution.started": true,
	"session.execution.succeeded": false,
	"session.execution.failed": false,
	"session.execution.interrupted": false,
	"session.idle": false,
};

/** Frames that mean "this session produced output" — the unread pip's trigger. */
const OUTPUT_EVENT_TYPES = new Set([
	"session.text.delta",
	"session.text.ended",
	"session.reasoning.delta",
	"session.reasoning.ended",
	"session.tool.success",
	"session.tool.failed",
	"session.shell.ended",
	"session.execution.failed",
]);

/** The strip's dot state, fed by events instead of a poll. */
export type ActivitySink = {
	setRunning: (sessionID: string, running: boolean) => void;
	hydrate: (ids: readonly string[]) => void;
	clear: () => void;
};

/** Apply one reduced frame's side effects. Called only after the store accepted it. */
export function applyFrameEffects(
	event: V2Event,
	activity: ActivitySink,
	onOutput: ((sessionID: string) => void) | undefined,
): void {
	const sessionID = sessionIDOf(event);
	if (sessionID === undefined) return;
	const running = EXECUTION_RUNNING[event.type];
	if (running !== undefined) activity.setRunning(sessionID, running);
	if (OUTPUT_EVENT_TYPES.has(event.type)) onOutput?.(sessionID);
}

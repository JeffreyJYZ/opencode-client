import type { V2Event } from "@opencode/client";
import { APP_EVENT } from "@/constants/plugins";
import { emitAppEvent } from "@/plugins/appEvents";

/**
 * The three session-shaped app events (spec 040 §The host, `on`): `turn-start` and
 * `turn-end` when the transcript's running flag flips, `chunk` when a streamed
 * content delta became a row.
 *
 * Called from `transcriptStore.ingest`, which is the one place the **previous** flag
 * and the **reduced** frame are both in hand. That matters: a redundant
 * `session.execution.*` frame reduces to the same transcript the store already held,
 * so a turn event emitted from the frame's type alone would fire for a session that
 * never changed — a fake. Here a turn event fires only on a real flip, and a delta
 * dropped after `.ended` (which reduces to `null`) emits no `chunk` because no row
 * came from it.
 */

/** The two families whose frames stream content one chunk at a time. */
const CHUNK_TYPES: ReadonlySet<string> = new Set(["session.text.delta", "session.reasoning.delta"]);

type DeltaEvent = Extract<V2Event, { type: "session.text.delta" | "session.reasoning.delta" }>;

function isDelta(event: V2Event): event is DeltaEvent {
	return CHUNK_TYPES.has(event.type);
}

export function emitFrameAppEvents(
	event: V2Event,
	sessionID: string,
	wasRunning: boolean,
	running: boolean,
): void {
	if (wasRunning !== running) {
		emitAppEvent(running ? APP_EVENT.turnStart : APP_EVENT.turnEnd, { sessionID });
	}
	if (isDelta(event)) {
		emitAppEvent(APP_EVENT.chunk, { sessionID, text: event.data.delta });
	}
}

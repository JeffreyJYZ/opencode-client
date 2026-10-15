import { createClient, type OpenCodeClient, probeConnection } from "@/session/client";
import { type ConnectionStore, createConnectionStore } from "@/session/connection";
import type { ActivitySink } from "@/session/ingestEffects";
import { createSessionIngest, type SessionIngest } from "@/session/sessionIngest";
import type { ResolvedTarget } from "@/session/target";
import type { TimerScheduler } from "@/session/timers";
import { createTranscriptStore, type TranscriptStore } from "@/session/transcriptStore";
import type { HeldSessions } from "@/session/transcriptSync";

/**
 * One client, its connection state, its transcript store and its event ingest,
 * built for one target (spec 050 §Target and auth, §Event ingest). Separated from
 * the provider so "which target" and "render it" are two modules; `target === null`
 * is the documented "no target" bundle, whose probe resolves without ever calling
 * the server and which has **no ingest** — there is nothing to subscribe to.
 *
 * The ingest is built here but **not started**: the provider owns the window in
 * which the app is watching, and stopping it must stop the subscription and the
 * timers. Everything it touches on the app side arrives through `hooks`, so this
 * module still knows nothing about tabs or React.
 */

export type IngestHooks = {
	readonly activity: ActivitySink;
	readonly sessions: HeldSessions;
	readonly onOutput?: (sessionID: string) => void;
	readonly timers?: TimerScheduler;
};

export type ClientBundle = {
	readonly client: OpenCodeClient | null;
	readonly target: ResolvedTarget | null;
	readonly connection: ConnectionStore;
	readonly transcripts: TranscriptStore;
	readonly ingest: SessionIngest | null;
};

/** A test's probe override; production passes nothing and the probe is `server.info()`. */
export type ProbeOverride = ((client: OpenCodeClient) => Promise<void>) | undefined;

export function buildBundle(
	target: ResolvedTarget | null,
	probe: ProbeOverride,
	clientOverride: OpenCodeClient | null | undefined,
	hooks: IngestHooks,
): ClientBundle {
	// An explicit override wins — the test seam the page and palette fixtures use —
	// otherwise a target builds a real client and no target builds none.
	const client =
		clientOverride === undefined
			? target === null
				? null
				: createClient(target)
			: clientOverride;
	const connection = createConnectionStore({
		target,
		probe: client === null ? () => Promise.resolve() : () => (probe ?? probeConnection)(client),
	});
	const transcripts = createTranscriptStore();
	const ingest =
		client === null
			? null
			: createSessionIngest({
					client,
					connection,
					transcripts,
					activity: hooks.activity,
					sessions: hooks.sessions,
					onOutput: hooks.onOutput,
					timers: hooks.timers,
				});
	return { client, target, connection, transcripts, ingest };
}

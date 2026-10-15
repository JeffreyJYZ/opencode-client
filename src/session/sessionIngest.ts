import type { V2Event } from "@opencode/client";
import { STREAM_ENDED_REASON, STREAM_IDLE_REASON } from "@/constants/server";
import { INGEST_OUTCOME } from "@/constants/transcript";
import type { OpenCodeClient } from "@/session/client";
import type { ConnectionStore } from "@/session/connection";
import {
	type ActivitySink,
	applyFrameEffects,
	SERVER_CONNECTED_EVENT,
} from "@/session/ingestEffects";
import { createStreamLiveness } from "@/session/streamLiveness";
import type { TimerScheduler } from "@/session/timers";
import type { TranscriptStore } from "@/session/transcriptStore";
import {
	createTranscriptSync,
	type HeldSessions,
	type TranscriptSync,
} from "@/session/transcriptSync";

/**
 * **One subscription for the whole app** (spec 050 §Event ingest;
 * `docs/opencode-api.md` §2). The stream carries **every** session and is volatile
 * by contract, so this module owns three things and delegates the rest:
 *
 * 1. **The subscription's lifetime**, including the bounded reconnect that
 *    `streamLiveness.ts` decides and the watchdog that replaces M0.5's poll.
 * 2. **The ingest boundary.** The pinned client's `SubscribeOptions` has no
 *    `accept` — only `signal` and `onActivity` (`dist/shared-events.d.ts`) — so the
 *    filter is ours: a frame for a session the app does not hold is **refused**
 *    before any handler runs (the store decides), and only a frame it *reduced*
 *    reaches a side effect.
 * 3. **The connection's state**: live, dropped or idle, reported to the connection
 *    store, which owns the banner.
 *
 * Which sessions are held and how a gap is repaired is `transcriptSync.ts`; what a
 * frame does to the dot and the pip is `ingestEffects.ts`.
 */

export type SessionIngestOptions = {
	readonly client: OpenCodeClient;
	readonly connection: Pick<ConnectionStore, "reportOnline" | "reportFailure">;
	readonly transcripts: TranscriptStore;
	readonly activity: ActivitySink;
	readonly sessions: HeldSessions;
	readonly timers?: TimerScheduler;
	/** The unread pip; the provider passes `notifySessionOutput`. */
	readonly onOutput?: (sessionID: string) => void;
};

export type SessionIngest = {
	start: () => void;
	stop: () => void;
	/** The retry action: attempt now, with a fresh budget. */
	restart: () => void;
};

export function createSessionIngest(options: SessionIngestOptions): SessionIngest {
	const { client, connection, transcripts, activity, sessions, onOutput } = options;
	const sync: TranscriptSync = createTranscriptSync({ client, transcripts, sessions, activity });
	let controller: AbortController | null = null;
	let unsubscribe: (() => void) | null = null;

	const liveness = createStreamLiveness({
		timers: options.timers,
		onIdle: () => fail(new Error(STREAM_IDLE_REASON)),
		onRetry: () => open(),
	});

	function fail(error: unknown): void {
		controller?.abort();
		controller = null;
		connection.reportFailure(error);
		activity.clear();
		liveness.dropped();
	}

	function onLive(): void {
		connection.reportOnline();
		const held = sync.sync();
		void sync.hydrate();
		for (const id of held) void sync.repair(id);
	}

	/** The filter: refused before any handler runs, side effects only on a reduction. */
	function accept(event: V2Event): void {
		if (event.type === SERVER_CONNECTED_EVENT) {
			onLive();
			return;
		}
		if (transcripts.ingest(event) !== INGEST_OUTCOME.reduced) return;
		applyFrameEffects(event, activity, onOutput);
	}

	async function consume(signal: AbortSignal): Promise<void> {
		try {
			for await (const event of client.event.subscribe({
				signal,
				onActivity: () => liveness.active(),
			})) {
				if (signal.aborted) return;
				liveness.active();
				accept(event);
			}
		} catch (error) {
			if (signal.aborted || (error as { name?: string }).name === "AbortError") return;
			fail(error);
			return;
		}
		if (!signal.aborted) fail(new Error(STREAM_ENDED_REASON));
	}

	function open(): void {
		controller?.abort();
		controller = new AbortController();
		void consume(controller.signal);
	}

	function start(): void {
		if (unsubscribe !== null) return;
		unsubscribe = sessions.subscribe(() => sync.sync());
		sync.sync();
		open();
	}

	function stop(): void {
		unsubscribe?.();
		unsubscribe = null;
		controller?.abort();
		controller = null;
		liveness.stop();
		activity.clear();
	}

	function restart(): void {
		liveness.restart();
		open();
	}

	return { start, stop, restart };
}

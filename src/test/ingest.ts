import type { SessionMessageInfo } from "@opencode/client";
import { createConnectionStore } from "@/session/connection";
import type { ActivitySink } from "@/session/ingestEffects";
import { createSessionIngest, type SessionIngest } from "@/session/sessionIngest";
import { TARGET_SOURCE } from "@/session/target";
import { createTranscriptStore, type TranscriptStore } from "@/session/transcriptStore";
import { type FakeClock, fakeTimers } from "@/test/session";
import { type FakeStream, fakeClient, fakeStream } from "@/test/stream";

/**
 * The event-ingest harness (M2.1): an injectable client, a fake clock and the three
 * app-side sinks, so the ingest is driven by frames the test pushes — `mock.module`
 * is never used (Bun's leaks process-wide).
 */

export const INGEST_TARGET = {
	url: "http://127.0.0.1:5251",
	password: undefined,
	source: TARGET_SOURCE.dev,
} as const;

export type IngestHarness = {
	readonly stream: FakeStream;
	readonly transcripts: TranscriptStore;
	readonly connection: ReturnType<typeof createConnectionStore>;
	readonly clock: FakeClock;
	readonly ingest: SessionIngest;
	readonly listCalls: () => string[];
	readonly outputs: string[];
	readonly sink: ActivitySink & {
		readonly running: ReadonlySet<string>;
		readonly hydrated: string[];
	};
};

/** A sink that records instead of publishing, for the assertions that need the calls. */
export function recordingSink(): IngestHarness["sink"] {
	const sink = {
		running: new Set<string>() as ReadonlySet<string>,
		hydrated: [] as string[],
		setRunning(id: string, running: boolean) {
			const next = new Set(sink.running);
			if (running) next.add(id);
			else next.delete(id);
			sink.running = next;
		},
		hydrate(ids: readonly string[]) {
			sink.hydrated = [...ids];
			sink.running = new Set(ids);
		},
		clear() {
			sink.running = new Set();
		},
	};
	return sink;
}

export type IngestOptions = {
	readonly held?: readonly string[];
	/** The sink the ingest writes to; defaults to the recorder this harness returns. */
	readonly activity?: ActivitySink;
	readonly history?: Record<string, { readonly data: readonly SessionMessageInfo[] }>;
	readonly active?: Record<string, unknown>;
};

export function ingestHarness(options: IngestOptions = {}): IngestHarness {
	const held = options.held ?? [];
	const history = options.history ?? {};
	const active = options.active ?? {};
	const stream = fakeStream();
	const { client, listCalls } = fakeClient(stream, history, active);
	const transcripts = createTranscriptStore();
	const connection = createConnectionStore({
		target: INGEST_TARGET,
		probe: async () => {},
	});
	const clock = fakeTimers();
	const outputs: string[] = [];
	const sink = recordingSink();
	const ingest = createSessionIngest({
		client,
		connection,
		transcripts,
		activity: options.activity ?? sink,
		sessions: { held: () => [...held], subscribe: () => () => {} },
		timers: clock.timers,
		onOutput: (id) => outputs.push(id),
	});
	return { stream, transcripts, connection, clock, ingest, listCalls, outputs, sink };
}

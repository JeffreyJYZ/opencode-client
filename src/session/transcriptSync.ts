import type { OpenCodeClient } from "@/session/client";
import type { ActivitySink } from "@/session/ingestEffects";
import { refetchTranscript } from "@/session/transcriptRefetch";
import type { TranscriptStore } from "@/session/transcriptStore";

/**
 * Which sessions the app holds, and how a gap in them is closed (spec 050 §Event
 * ingest: "**gaps are repaired by refetch, never by replay**";
 * `docs/opencode-api.md` §2: a slow consumer overflows — the client's own
 * subscriber aborts at 4096 events — and a disconnect loses events).
 *
 * "Held" is the **open session tabs**: the strip already owns which sessions the
 * app has open, it survives a restart (M1.5), and it is the same set whose dots the
 * strip draws. A frame for any other session is refused by the store, so one
 * subscription can carry every session on the server.
 *
 * A gap can exist at exactly two moments, and both refetch `message.list` and
 * **replace** the transcript's rows:
 *
 * 1. **A tab starts being held** — the transcript has no baseline at all.
 * 2. **The stream goes live** — `server.connected`, which the client replays to
 *    every new subscription, so this covers the first connect, a reconnect and a
 *    resume after sleep alike. A missed page is a drop: the iterator throws or
 *    ends, the ingest goes offline, and coming back live lands here.
 */

export type HeldSessions = {
	held: () => readonly string[];
	subscribe: (listener: () => void) => () => void;
};

export type TranscriptSync = {
	/** Hold a new tab and drop a closed one; returns the held ids now. */
	sync: () => readonly string[];
	repair: (sessionID: string) => Promise<void>;
	/** `session.active()` once per live transition: what ran before we connected. */
	hydrate: () => Promise<void>;
};

export type TranscriptSyncOptions = {
	readonly client: OpenCodeClient;
	readonly transcripts: TranscriptStore;
	readonly sessions: HeldSessions;
	readonly activity: ActivitySink;
};

export function createTranscriptSync(options: TranscriptSyncOptions): TranscriptSync {
	const { client, transcripts, sessions, activity } = options;

	async function repair(sessionID: string): Promise<void> {
		const rows = await refetchTranscript(client, sessionID);
		if (rows !== null) transcripts.resync(sessionID, rows);
	}

	function sync(): readonly string[] {
		const wanted = new Set(sessions.held());
		for (const id of wanted) {
			if (transcripts.get(id) !== undefined) continue;
			transcripts.hold(id);
			void repair(id);
		}
		for (const id of transcripts.held()) if (!wanted.has(id)) transcripts.release(id);
		return [...wanted];
	}

	async function hydrate(): Promise<void> {
		try {
			activity.hydrate(Object.keys(await client.session.active()));
		} catch {
			// The banner owns the failure; the dots stay as they are.
		}
	}

	return { sync, repair, hydrate };
}

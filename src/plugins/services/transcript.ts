import type { Transcript, TranscriptRow } from "@/session/transcript";

/**
 * `transcript.snapshot()` (spec 040 §The host): the open session's rows,
 * synchronously — **a projection, not the store**.
 *
 * What it returns is a fresh, deep-frozen copy: the array and every object in it
 * are copies, so mutating what a plugin received cannot reach the store, and the
 * freeze makes the attempt throw rather than fail silently. The plugin gets what
 * is rendered now; it cannot add, replace or reorder a row, and it cannot reach
 * the ingest, the reducer or the store.
 */

export type TranscriptSnapshot = {
	/** The open session's id, or `null` when no session is open. */
	readonly sessionID: string | null;
	readonly rows: readonly TranscriptRow[];
};

export type PluginTranscript = {
	snapshot(): TranscriptSnapshot;
};

const NO_ROWS: readonly TranscriptRow[] = Object.freeze([]);

/** A deep copy of plain data: rows carry strings, numbers and nested payloads. */
function copy(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(copy);
	if (typeof value === "object" && value !== null) {
		const out: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(value)) out[key] = copy(entry);
		return out;
	}
	return value;
}

/** Freeze a copied value all the way down, so a mutation throws in strict mode. */
function freezeDeep<T>(value: T): T {
	if (value !== null && typeof value === "object") {
		for (const entry of Object.values(value)) freezeDeep(entry);
		Object.freeze(value);
	}
	return value;
}

export function createPluginTranscript(read: () => Transcript | undefined): PluginTranscript {
	return {
		snapshot(): TranscriptSnapshot {
			const transcript = read();
			if (transcript === undefined) return { sessionID: null, rows: NO_ROWS };
			const rows = freezeDeep(
				transcript.rows.map((row) => copy(row)),
			) as readonly TranscriptRow[];
			return { sessionID: transcript.sessionID, rows };
		},
	};
}

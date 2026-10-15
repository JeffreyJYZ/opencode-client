import { EVENT_ID_MEMORY } from "@/constants/transcript";
import type { Transcript, TranscriptRow } from "@/session/transcript";

/**
 * The transcript's edits (spec 050 §Event ingest). Every one is pure and returns
 * a **new** transcript that keeps the untouched rows by reference — M2.2 memos a
 * row list on the transcript identity, so a needless copy is a needless re-render.
 *
 * Rows are appended at the tail: arrival order *is* the transcript's order, which
 * is what keeps a queued prompt in enqueue order at the tail (spec 050 §Acceptance).
 * Nothing here reorders, so an out-of-order frame can only ever be stale data
 * inside one row, never a moved row.
 */

export function appendRow(transcript: Transcript, row: TranscriptRow): Transcript {
	return { ...transcript, rows: [...transcript.rows, row] };
}

/** Patch the row with `id`; the transcript is returned unchanged when it is absent. */
export function replaceRow(
	transcript: Transcript,
	id: string,
	patch: (row: TranscriptRow) => TranscriptRow,
): Transcript {
	let changed = false;
	const rows = transcript.rows.map((row) => {
		if (row.id !== id) return row;
		const next = patch(row);
		if (next !== row) changed = true;
		return next;
	});
	return changed ? { ...transcript, rows } : transcript;
}

/** Replace the row with the same id, else append it. Idempotent by row id. */
export function upsertRow(transcript: Transcript, row: TranscriptRow): Transcript {
	const at = transcript.rows.findIndex((existing) => existing.id === row.id);
	if (at === -1) return appendRow(transcript, row);
	const rows = [...transcript.rows];
	rows[at] = row;
	return { ...transcript, rows };
}

export function removeRow(transcript: Transcript, id: string): Transcript {
	const rows = transcript.rows.filter((row) => row.id !== id);
	return rows.length === transcript.rows.length ? transcript : { ...transcript, rows };
}

export function setRunning(transcript: Transcript, running: boolean): Transcript {
	return transcript.running === running ? transcript : { ...transcript, running };
}

/**
 * Record an applied frame: its id in the duplicate memory, and its `durable.seq`
 * as the watermark. The memory is bounded, and trimming keeps the newest half —
 * the ids a reconnect is most likely to repeat.
 */
export function remember(transcript: Transcript, eventID: string, seq: number | null): Transcript {
	const seed =
		transcript.seen.size >= EVENT_ID_MEMORY
			? new Set([...transcript.seen].slice(-(EVENT_ID_MEMORY / 2)))
			: new Set(transcript.seen);
	seed.add(eventID);
	return {
		...transcript,
		seen: seed,
		lastSeq: seq === null || seq <= transcript.lastSeq ? transcript.lastSeq : seq,
	};
}

import type { ModelRef } from "@opencode/client";
import { DELIVERY, type Delivery, ROW_KIND, type ToolStatus } from "@/constants/transcript";
import type { Payload } from "@/session/payloadCaps";

/**
 * The transcript's **shape** (spec 050 §Event ingest): a session's rows in the
 * order the stream produced them, the session's running flag, and the two pieces
 * of bookkeeping the ingest needs — the highest `durable.seq` applied and the
 * event ids already seen.
 *
 * One shape for both sources, on purpose: the stream reduces into it and a
 * refetch **replaces** its rows with the same kind, so a repaired transcript and
 * a streamed one are indistinguishable to M2.2. Rows are immutable; every edit
 * returns a new transcript that keeps the untouched rows by reference, which is
 * what lets a memoised row list stay stable.
 *
 * `seq` is a row's provenance, not its order: rows stay in arrival order and the
 * transcript's `lastSeq` is what rejects a stale durable frame.
 *
 * A row's text is a **`Payload`** (M2.4), never a bare string: only
 * `src/session/payloadCaps.ts` makes one, so a payload cannot enter the store
 * uncapped, and the count of what the cap dropped travels with the text instead of
 * being recomputed by whoever renders it.
 */

export type RowBase = {
	readonly id: string;
	readonly created: number;
	/** The `durable.seq` of the frame that wrote this row; `0` when the frame had none. */
	readonly seq: number;
};

/** A prompt the user sent: `queued` until the server delivers it (spec 050 §Sessions). */
export type UserRow = RowBase & {
	readonly kind: typeof ROW_KIND.user;
	readonly text: string;
	readonly delivery: Delivery;
};

/** Assistant prose or reasoning; `ended` marks the authoritative frame's text. */
export type TextRow = RowBase & {
	readonly kind: typeof ROW_KIND.prose | typeof ROW_KIND.reasoning;
	readonly text: Payload;
	readonly ended: boolean;
	/**
	 * When the part finished (M2.17), from the reasoning `.ended` frame's own
	 * `created` or a refetched part's `time.completed`. Absent while a part streams,
	 * which is what makes a duration honest: it is only ever a measured pair
	 * (`created` → `endedAt`), never an invented one.
	 */
	readonly endedAt?: number;
};

/** One tool call. A subagent call is this row with a child session in its input (M2.2). */
export type ToolRow = RowBase & {
	readonly kind: typeof ROW_KIND.tool;
	readonly name: string;
	readonly input: string;
	readonly status: ToolStatus;
	readonly output: Payload;
	readonly anchor?: string;
};

/** A shell command and its paged output (`output.output`, api §4). */
export type ShellRow = RowBase & {
	readonly kind: typeof ROW_KIND.shell;
	readonly command: string;
	readonly status: string;
	readonly output: Payload;
};

export type ErrorRow = RowBase & { readonly kind: typeof ROW_KIND.error; readonly message: string };

export type NoticeRow = RowBase & { readonly kind: typeof ROW_KIND.notice; readonly text: string };

/**
 * A step's own start, kept from `session.step.started` until its end builds the
 * footer (M2.16). Held per assistant message so a step that ends by asking for a
 * tool can be dropped **without** a half-footer ever being painted.
 */
export type StepStart = {
	readonly agent: string;
	readonly model: ModelRef;
	/** `session.step.started`'s own `started` timestamp — the footer's clock start. */
	readonly started: number;
};

/**
 * The per-prompt footer (M2.16; spec 020 §Transcript: `agent · model · duration ·
 * tok/s`, printed once per prompt). Each field is the assistant message's **own** —
 * its agent and model (`session.step.started`), the span between that step's start
 * and its end, and the step's own output tokens — so the line describes the step,
 * never the session's current selection.
 */
export type FooterRow = RowBase & {
	readonly kind: typeof ROW_KIND.footer;
	readonly agent?: string;
	readonly model?: ModelRef;
	readonly durationMs?: number;
	readonly outputTokens?: number;
};

export type TranscriptRow =
	| UserRow
	| TextRow
	| ToolRow
	| ShellRow
	| ErrorRow
	| NoticeRow
	| FooterRow;

export type Transcript = {
	readonly sessionID: string;
	readonly rows: readonly TranscriptRow[];
	/** `session.execution.*`'s flag — the tab dot, `esc interrupt` and the statusline. */
	readonly running: boolean;
	/** The highest `durable.seq` applied, or `-1` before the first durable frame. */
	readonly lastSeq: number;
	/** Event ids already applied; bounded by `EVENT_ID_MEMORY`. */
	readonly seen: ReadonlySet<string>;
	/** `session.step.started` frames still awaiting their end, keyed by assistant message. */
	readonly steps: ReadonlyMap<string, StepStart>;
};

export function emptyTranscript(sessionID: string): Transcript {
	return { sessionID, rows: [], running: false, lastSeq: -1, seen: new Set(), steps: new Map() };
}

/** Whether a row kind is prose or reasoning — the two the stream appends to. */
export function isTextRow(row: TranscriptRow): row is TextRow {
	return row.kind === ROW_KIND.prose || row.kind === ROW_KIND.reasoning;
}

/**
 * Whether any prompt in this transcript is still waiting to be delivered (M2.26).
 * The composer's "Queued" label reads **this**, never the running flag: a turn with
 * an empty queue says nothing, and the queue's real state is the reducer's own
 * `DELIVERY.queued` on a user row. Existence only — the row count is not this read.
 */
export function hasQueuedPrompt(transcript: Transcript | undefined): boolean {
	if (transcript === undefined) return false;
	return transcript.rows.some(
		(row) => row.kind === ROW_KIND.user && row.delivery === DELIVERY.queued,
	);
}

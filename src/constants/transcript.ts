/**
 * The transcript store's vocabulary (spec 050 §Event ingest, §Ingest discipline).
 *
 * Named here so no second place restates a value: the row kinds M2.2 renders, the
 * user band's rail tones, a tool's status, what the ingest did with one frame, the
 * strings the notice rows carry, and the two bounds the store itself needs.
 *
 * Deliberately absent: the caps (`PAYLOAD_MAX_CHARS`, `PAYLOAD_ELISION`,
 * `TOOL_CONTENT_MAX_CHARS`) are **M2.4's**, applied at the append funnels the
 * transcript edits expose, not here.
 */

/** What one transcript row is. M2.2 renders a surface per kind. */
export const ROW_KIND = {
	user: "user",
	prose: "prose",
	reasoning: "reasoning",
	tool: "tool",
	shell: "shell",
	error: "error",
	notice: "notice",
	footer: "footer",
} as const;

export type RowKind = (typeof ROW_KIND)[keyof typeof ROW_KIND];

/** The user band's rail tone: an enqueued prompt, or one the server has delivered. */
export const DELIVERY = {
	queued: "queued",
	delivered: "delivered",
} as const;

export type Delivery = (typeof DELIVERY)[keyof typeof DELIVERY];

/** A tool row's state — the server's `streaming`/`running`/`completed`/`error`, collapsed. */
export const TOOL_STATUS = {
	streaming: "streaming",
	running: "running",
	ok: "ok",
	failed: "failed",
} as const;

export type ToolStatus = (typeof TOOL_STATUS)[keyof typeof TOOL_STATUS];

/** The input key a tool row anchors on — `path`, never `filePath` (api §4). */
export const TOOL_ANCHOR_FIELD = "path";

/**
 * What the ingest did with one frame (spec 050 §Event ingest): `refused` is a
 * session this app does not hold, `duplicate` an event id or `durable.seq` it has
 * already applied, `ignored` a type no row comes from, `reduced` a real change.
 */
export const INGEST_OUTCOME = {
	reduced: "reduced",
	ignored: "ignored",
	duplicate: "duplicate",
	refused: "refused",
} as const;

export type IngestOutcome = (typeof INGEST_OUTCOME)[keyof typeof INGEST_OUTCOME];

/** The notice rows' text (spec 050's table: compaction, revert and retry rows). */
export const NOTICE = {
	compacting: "Compacting context",
	compacted: "Context compacted",
	compactionFailed: "Compaction failed",
	revertStaged: "Revert staged",
	revertCleared: "Revert cleared",
	revertCommitted: "Revert committed",
	retrying: "Retrying",
} as const;

/** How many event ids one transcript remembers, for duplicate detection. */
export const EVENT_ID_MEMORY = 128;

/** How many messages one refetch asks for; the tail of a transcript (M2.9 owns back-fill). */
export const MESSAGE_PAGE_LIMIT = 50;

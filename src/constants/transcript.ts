/**
 * The transcript store's vocabulary (spec 050 §Event ingest, §Ingest discipline).
 *
 * Named here so no second place restates a value: the row kinds M2.2 renders, the
 * user band's rail tones, a tool's status, what the ingest did with one frame, the
 * strings the notice rows carry, and the three bounds the store itself needs.
 *
 * The **caps are M2.4's** (spec 050 §Ingest discipline) and their values live
 * here; the one place they are *applied* is `src/session/payloadCaps.ts`, which
 * every text payload the store keeps passes through.
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

/**
 * The one `session.step.ended` finish that carries **no** footer row (spec 020
 * §Transcript: "printed once per prompt (a `tool-calls` step carries none)"). A step
 * that ended by asking for a tool has no prompt-completion to summarise, so the
 * guard and the spec must not drift — hence a name, not a literal.
 */
export const FINISH_TOOL_CALLS = "tool-calls";

/** The input key a tool row anchors on — `path`, never `filePath` (api §4). */
export const TOOL_ANCHOR_FIELD = "path";

/**
 * The input key that carries the line a tool read from (M5.2): `read`'s own
 * `offset`. Absent for a call that touched a whole file (`edit`, `write`), which is
 * why `rowEditorTarget` falls back to `DEFAULT_EDITOR_LINE` rather than inventing one.
 */
export const TOOL_LINE_FIELD = "offset";

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

/** How many messages one refetch asks for — the newest page a repair replaces a transcript with. */
export const MESSAGE_PAGE_LIMIT = 50;

/**
 * **The ingest cap**: the most characters of one text payload the store keeps
 * (spec 050 §Ingest discipline). A longer payload keeps its head, and the store
 * counts the line breaks it dropped, so nothing re-inflates a trimmed payload.
 */
export const PAYLOAD_MAX_CHARS = 50_000;

/**
 * What the ingest's own elision reads where it cut. A marker, never part of the
 * payload: the dropped lines are a number on the row's `Payload`, so an elision
 * row cannot be counted twice as a line of its own.
 */
export const PAYLOAD_ELISION = "… more output, elided at ingest";

/**
 * **The render cap**: the collapsed head of a tool or a shell output block. Per
 * spec 050 it stays smaller than `PAYLOAD_MAX_CHARS`, or a collapsed row would
 * render whole and the collapsed/expanded state would mean nothing.
 */
export const TOOL_CONTENT_MAX_CHARS = 2_000;

/** How deep a tool's input record is kept before a container below it is elided. */
export const TOOL_INPUT_MAX_DEPTH = 6;

/** What a container below `TOOL_INPUT_MAX_DEPTH` is replaced by, in the input text. */
export const TOOL_INPUT_ELISION = "…";

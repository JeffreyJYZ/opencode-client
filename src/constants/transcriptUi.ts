/**
 * The transcript rows' render vocabulary (spec 050 §Event ingest; M2.2 renders it).
 *
 * Every visible string and DOM attribute a row uses lives here, so no row
 * component holds a literal (repo rule: every constant by name). The **state**
 * values are deliberately absent — they are M2.1's store (`DELIVERY`,
 * `TOOL_STATUS`, `ROW_KIND` in `constants/transcript.ts`) and a second copy of
 * them would be a second source of truth for what a row *is*.
 */

/** The attribute carrying a row's store id, so append stability is proved on it. */
export const ROW_ID_ATTR = "data-row";

/** The attribute carrying a trimmed payload's `(N more lines)` number (M2.4, M2.3b). */
export const MORE_LINES_ATTR = "data-more-lines";

/** The transcript region's accessible name. */
export const TRANSCRIPT_LABEL = "Transcript";

/** A transcript with no rows yet — a freshly opened tab, or a server with none. */
export const TRANSCRIPT_EMPTY_LABEL = "No messages yet";

/** The user band's rail: what each delivery state reads. */
export const RAIL_LABEL = {
	queued: "Queued",
	delivered: "Sent",
} as const;

/** A tool row's status word, per the store's `TOOL_STATUS` value. */
export const TOOL_STATUS_LABEL = {
	streaming: "Streaming",
	running: "Running",
	ok: "Done",
	failed: "Failed",
} as const;

/** A tool call whose name has not arrived yet (the creating frame carries only an id). */
export const TOOL_UNNAMED = "Tool";

/** The tool whose row is a subagent call — `packages/core/src/tool/plugin/subagent.ts`. */
export const SUBAGENT_TOOL_NAME = "subagent";

/** The subagent row's kind word; the call's own subject follows it. */
export const SUBAGENT_LABEL = "Subagent";

/** The subagent input fields the row names itself from, in order of usefulness. */
export const SUBAGENT_DETAIL_FIELDS = ["description", "agent"] as const;

/** The input field that continues an earlier subagent conversation, shown when set. */
export const SUBAGENT_SESSION_FIELD = "sessionID";

/** The shell row's kind word, and the prompt mark before its command. */
export const SHELL_LABEL = "Shell";
export const SHELL_PROMPT = "$";

/** A shell's status word, per the server's own four values. */
export const SHELL_STATUS_LABEL = {
	running: "Running",
	exited: "Exited",
	timeout: "Timed out",
	killed: "Killed",
} as const;

/**
 * The reasoning row's collapsed group (M2.17, spec 020 §Transcript):
 * `+ Thought: <title> · <duration>`, expanded by a click — the text lives behind
 * the summary, so the marker is the label word itself and colour is never its only
 * signal. The `+` is the collapsed mark, the `-` the open one.
 */
export const REASONING_GROUP_MARK = "+";
export const REASONING_GROUP_OPEN_MARK = "-";
export const REASONING_LABEL = "Thought";
/** Between the label and the summary's title. */
export const REASONING_TITLE_SEPARATOR = ": ";
/** Between the summary's title and its duration. */
export const REASONING_SEPARATOR = " · ";
/** The group's toggle carries its own state, so a proof reads it off the DOM. */
export const REASONING_EXPANDED_ATTR = "data-reasoning-expanded";

/**
 * A reasoning group's duration (M2.17): the units and the thresholds between them,
 * ported from the TUI's own scale so the same run reads the same in both apps.
 */
export const DURATION_UNIT = {
	ms: "ms",
	seconds: "s",
	minutes: "m",
	hours: "h",
	days: "d",
} as const;
export const DURATION_MS = 1000;
export const DURATION_MINUTE_MS = 60 * DURATION_MS;
export const DURATION_HOUR_MS = 60 * DURATION_MINUTE_MS;
export const DURATION_DAY_MS = 24 * DURATION_HOUR_MS;
/** Seconds show one decimal; below a second the exact millisecond count is kept. */
export const DURATION_SECONDS_DECIMALS = 1;
/** Between the two figures of a compound duration (`1m 5s`). */
export const DURATION_PAIR_SEPARATOR = " ";

/** Cost decimals in a footer (M2.8 owns the statusline's spend). */
export const COST_DECIMALS = 4;

/**
 * A collapsed output block's toggle: `(N more lines)` (M2.4). A prefix/suffix pair
 * with the count between them, so the number is a value and not a string built
 * inline by a component.
 */
export const OUTPUT_MORE_PREFIX = "(";
export const OUTPUT_MORE_SUFFIX = " more lines)";

/** The affordance that gives an expanded block its head back. */
export const OUTPUT_COLLAPSE_LABEL = "Show less";

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

/** The reasoning row's marker: a word in the type scale, so colour is not its only signal. */
export const REASONING_LABEL = "Reasoning";

/** Cost decimals in a footer (M2.8 owns the statusline's spend). */
export const COST_DECIMALS = 4;

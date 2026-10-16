/**
 * The statusline's vocabulary (spec 020 §Statusline, M2.8).
 *
 * Segment copy, the separators, and the compact token formatter's bounds. The
 * retry bound for the branch is `constants/vcs.ts` — it belongs to the VCS read,
 * which the Session panel shares with the statusline.
 */

/** The region's accessible name. */
export const STATUSLINE_LABEL = "Statusline";

/** The two hints spec 020 names: while a turn runs, and when it does not. */
export const STATUSLINE_HINT = {
	running: "esc interrupt",
	idle: "⌘K commands",
} as const;

/** The prefix and suffix of the subagent count, e.g. `↓ 2 subagents`. */
export const STATUSLINE_SUBAGENT_PREFIX = "↓";
export const STATUSLINE_SUBAGENT_SUFFIX = "subagents";
export const STATUSLINE_TOKENS_SUFFIX = "tokens";
export const STATUSLINE_SPEND_PREFIX = "$";

/** `dir:branch` — the separator between the location and the branch. */
export const STATUSLINE_BRANCH_SEPARATOR = ":";

/** A segment with nothing to show yet. */
export const STATUSLINE_UNKNOWN = "…";

/** The compact token formatter: `1 234` renders as `1.2k`. */
export const TOKEN_COMPACT_UNIT = 1000;
export const TOKEN_COMPACT_DECIMALS = 1;

/** Each segment's tooltip/title: what a click does — copy a value or open a panel. */
export const STATUSLINE_SEGMENT_TITLE = {
	location: "Copy the session directory",
	subagents: "Open the subagent list",
	tokens: "Copy the session token count",
	spend: "Copy the session spend",
} as const;

/**
 * Session-related constants (spec 010 §Home, spec 050 §Sessions).
 *
 * `SESSION_PAGE_LIMIT` is the page size for the root-session query; the M1.2
 * hook and M1.4's picker both read it. The status vocabulary is what `useSessions`
 * exposes so a no-target or offline server renders as a state rather than an
 * empty list.
 */

/** Page size for `session.list({ parentID: null })`. */
export const SESSION_PAGE_LIMIT = 50;

/** Status vocabulary for the session list. */
export const SESSION_STATUS = {
	none: "none",
	loading: "loading",
	error: "error",
	empty: "empty",
	ready: "ready",
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

/** Title shown for a session that has none. */
export const UNTITLED_SESSION_TITLE = "Untitled session";

/** Last path segment truncation for a recent row. */
export const RECENT_DIRECTORY_MAX_CHARS = 24;

/** Relative-time thresholds. */
export const RELATIVE_TIME_MINUTE_MS = 60_000;
export const RELATIVE_TIME_HOUR_MS = 3_600_000;
export const RELATIVE_TIME_DAY_MS = 86_400_000;

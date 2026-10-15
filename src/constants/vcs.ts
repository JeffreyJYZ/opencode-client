/**
 * The VCS read's bounds (spec 020 §Statusline: "the branch needs a bounded
 * retry, because the server resolves VCS asynchronously per location").
 *
 * `vcs.get()` answers `{"branch":{}}` immediately after a location is activated
 * and the real branch about half a second later (`docs/opencode-api.md` §4), so
 * the read is retried while it is empty — never forever, and never by calling
 * `vcs.init` (a write that would create a repository).
 */

/** How many `vcs.get()` reads one branch resolution may make. */
export const BRANCH_RETRY_LIMIT = 10;

/** The delay between two reads; `0.25 s × 10` bounds the wait at ~2.25 s. */
export const BRANCH_RETRY_DELAY_MS = 250;

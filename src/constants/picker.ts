/**
 * The session picker's constants (spec 010 §Top nav: the `⌕` row — "all root
 * sessions, searchable"; §Desktop behaviours; spec 050 §Sessions).
 *
 * Every visible string and the ARIA ids live here so no component holds a
 * literal. The page size is deliberately **not** repeated: the picker's data
 * path defaults to `SESSION_PAGE_LIMIT` and takes an override for tests.
 */

/** The dialog's accessible name (`⌕` itself carries `PICKER_TITLE`). */
export const PICKER_DIALOG_LABEL = "Find session";

/** The search field. */
export const PICKER_SEARCH_LABEL = "Search sessions";
export const PICKER_SEARCH_PLACEHOLDER = "Search by title or directory";

/** One list id, so the field can name the list it drives with `aria-controls`. */
export const PICKER_LIST_ID = "oc-session-picker-list";

/** The list's own accessible name; distinct from the field's, never a second
 * element answering the field's label query. */
export const PICKER_LIST_LABEL = "Matching sessions";

/** A row option's id prefix; the option id is this plus the session id. */
export const PICKER_OPTION_ID_PREFIX = "oc-session-picker-option-";

/**
 * The states, one sentence each: a picker that found nothing, a server with no
 * sessions, and a failed query must not read the same (spec 010 §Desktop
 * behaviours, "never a silent failure").
 */
export const PICKER_LOADING_LABEL = "Loading sessions…";
export const PICKER_NO_MATCH_LABEL = "No sessions match";
export const PICKER_EMPTY_LABEL = "No sessions yet";
export const PICKER_ERROR_LABEL = "Could not load sessions";
export const PICKER_NONE_LABEL = "No server connected";

/** Following the cursor: the affordance at the end of the loaded pages. */
export const PICKER_LOAD_MORE_LABEL = "Load more";
export const PICKER_MORE_ERROR_LABEL = "Could not load more";

/** How many pixels from the bottom a scroll loads the next page. */
export const PICKER_SCROLL_THRESHOLD_PX = 48;

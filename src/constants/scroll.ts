/**
 * The transcript's scroll model (M2.9). Named here so no hook and no component
 * holds one of its numbers.
 */

/**
 * How close to the bottom still counts as **the tail**, in CSS pixels. A few
 * pixels of slack, because a sub-pixel layout approximation should not read as
 * "the reader scrolled away".
 */
export const TAIL_THRESHOLD_PX = 24;

/** How many tabs' positions the settings blob remembers, oldest dropped first. */
export const SCROLL_MEMORY_LIMIT = 32;

/** The pill that puts a scrolled-away reader back on the tail. */
export const JUMP_LATEST_LABEL = "Jump to latest";

/**
 * The pill's count of rows below the fold (M2.22, spec 020 §Scroll): a prefix and a
 * suffix with the number between them, so the count is a value and not a string a
 * component builds inline — `Jump to latest (5 rows below)`.
 */
export const JUMP_LATEST_COUNT_PREFIX = " (";
export const JUMP_LATEST_COUNT_SUFFIX = " rows below)";

/** The attribute the pill carries, so a proof finds it by identity, not by words. */
export const JUMP_LATEST_ATTR = "data-jump-latest";

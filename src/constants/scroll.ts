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

/** The attribute the pill carries, so a proof finds it by identity, not by words. */
export const JUMP_LATEST_ATTR = "data-jump-latest";

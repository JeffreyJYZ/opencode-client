import type { CSSProperties } from "react";

/**
 * The style the three placeholder surfaces share, so none of them holds a token
 * value of its own and all three use the theme the app already defines.
 *
 * M1.2/M2.x/M3.5 replace the pages themselves, and this constant goes with them.
 */
export const PLACEHOLDER_STYLE: CSSProperties = {
	color: "var(--oc-text)",
	padding: "var(--oc-space-4)",
};

/**
 * The session surface's frame (M2.2/M2.9): the column that holds the transcript's
 * own scroll container and, over it, the jump-to-latest pill. `position: relative`
 * is the pill's containing block; `flex: 1 1 0%` with `minHeight: 0` is what lets
 * the pane be shorter than its content (api §4's flex trap).
 */
export const SESSION_VIEW_STYLE: CSSProperties = {
	position: "relative",
	display: "flex",
	flexDirection: "column",
	flex: "1 1 0%",
	minHeight: 0,
};

/**
 * The transcript's scroll container (M2.9): the element `useTailFollow` reads and
 * writes. All three of `overflowY: auto`, `flex: 1 1 0%` and `minHeight: 0` are
 * load-bearing — a content-sized pane in a flex column shrinks to fit instead of
 * overflowing, so a long transcript is clipped rather than scrolled (api §4) — and
 * `overscroll-behavior` keeps a wheel at the end from chaining to the page.
 */
export const SESSION_PAGE_STYLE: CSSProperties = {
	color: "var(--oc-text)",
	padding: 0,
	flex: "1 1 0%",
	minHeight: 0,
	overflowY: "auto",
	overscrollBehavior: "contain",
};

/**
 * The shell's frame (M2.7/M2.8): a column whose pane row grows, so the sidebar
 * sits beside the transcript and the statusline spans the window below both.
 * `flex: 1 1 0%` makes the row take exactly the space the nav and statusline
 * leave, so the nav never shrinks.
 */
export const SHELL_BODY_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	flex: "1 1 0%",
	minHeight: 0,
};

export const SHELL_ROW_STYLE: CSSProperties = {
	display: "flex",
	flex: "1 1 0%",
	minHeight: 0,
	minWidth: 0,
};

/** The transcript column: the row's growing cell, the sidebar its fixed one. */
export const SHELL_MAIN_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	flex: "1 1 0%",
	minWidth: 0,
	minHeight: 0,
};

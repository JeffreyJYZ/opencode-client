import type { CSSProperties } from "react";

/**
 * The update notice's look (M5.6): a band of chrome in the shell's own column,
 * the way the banner band is — it takes its place rather than covering the app.
 * Tokens only, so both themes are this one file.
 */

/** The band: a raised row with an accent edge, the shape a notice takes. */
export const UPDATE_NOTICE_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-3)",
	padding: "var(--oc-space-2) var(--oc-space-4)",
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	borderBottom: "1px solid var(--oc-accent)",
};

/** The notice's own words. */
export const UPDATE_NOTICE_TEXT_STYLE: CSSProperties = {
	flex: "1 1 auto",
	minWidth: 0,
};

/** The progress line beside the offer. */
export const UPDATE_ROW_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
};

import type { CSSProperties } from "react";

/** The statusline's presentation (spec 020 §Statusline). Tokens only. */

export const BAR_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: "var(--oc-space-3)",
	flexShrink: 0,
	height: "var(--oc-nav-height)",
	padding: "0 var(--oc-space-2)",
	background: "var(--oc-surface)",
	borderTop: "1px solid var(--oc-border)",
	fontSize: "var(--oc-font-size-meta)",
};

export const GROUP_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-1)",
	minWidth: 0,
};

export const SEGMENT_STYLE: CSSProperties = {
	background: "transparent",
	color: "var(--oc-text-muted)",
	border: "1px solid transparent",
	borderRadius: "var(--oc-radius)",
	padding: "0 var(--oc-space-1)",
	font: "inherit",
	fontSize: "inherit",
	cursor: "pointer",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

/** The hint is muted further than a segment, so an action never reads as a figure. */
export const HINT_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	fontStyle: "italic",
};

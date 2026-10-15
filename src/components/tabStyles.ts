import type { CSSProperties } from "react";

/** One tab's presentation (spec 010 §Top nav, tokens per spec 030 §Tokens). */

export const TAB_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-2)",
	background: "transparent",
	color: "var(--oc-text-muted)",
	fontFamily: "var(--oc-font-ui)",
	fontSize: "var(--oc-font-ui-size)",
	border: "none",
	borderBottom: "2px solid transparent",
	padding: "var(--oc-space-2) var(--oc-space-2)",
	cursor: "pointer",
	maxWidth: "220px",
	minWidth: "0",
};

export const TAB_ACTIVE_STYLE: CSSProperties = {
	...TAB_STYLE,
	color: "var(--oc-text)",
	borderBottom: "2px solid var(--oc-accent)",
};

export const TAB_TITLE_STYLE: CSSProperties = {
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

export const TAB_DOT_STYLE: CSSProperties = {
	width: "8px",
	height: "8px",
	borderRadius: "50%",
	flexShrink: 0,
};

export const TAB_CLOSE_STYLE: CSSProperties = {
	background: "transparent",
	color: "inherit",
	border: "none",
	borderRadius: "var(--oc-radius)",
	padding: "0 var(--oc-space-1)",
	cursor: "pointer",
	font: "inherit",
};

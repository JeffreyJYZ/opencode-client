import type { CSSProperties } from "react";

/**
 * The sidebar's presentation (spec 020 §Sidebar, spec 030 §Tokens). Every colour
 * and space is a token; the only raw number is the width, which is the persisted
 * value the store owns — never a style's own idea of a size.
 */

export const SIDEBAR_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	flexShrink: 0,
	alignSelf: "stretch",
	background: "var(--oc-surface)",
	borderLeft: "1px solid var(--oc-border)",
	position: "relative",
	overflow: "hidden",
};

export const SIDEBAR_SCROLL_STYLE: CSSProperties = {
	flex: "1 1 auto",
	minHeight: 0,
	overflowY: "auto",
	overflowX: "hidden",
};

/** The drag handle: a thin `<hr>` the pointer can grab, no visible chrome. */
export const RESIZER_STYLE: CSSProperties = {
	position: "absolute",
	top: 0,
	left: 0,
	bottom: 0,
	width: "var(--oc-space-1)",
	margin: 0,
	padding: 0,
	border: "none",
	background: "transparent",
	cursor: "col-resize",
};

export const PANEL_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
	padding: "var(--oc-space-3)",
	borderBottom: "1px solid var(--oc-border)",
};

export const PANEL_TITLE_STYLE: CSSProperties = {
	margin: 0,
	fontSize: "var(--oc-font-size-meta)",
	fontWeight: 600,
	color: "var(--oc-text-muted)",
};

export const PANEL_BODY_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
};

export const FIELD_STYLE: CSSProperties = {
	display: "flex",
	gap: "var(--oc-space-2)",
	justifyContent: "space-between",
	alignItems: "baseline",
	minWidth: 0,
};

export const FIELD_LABEL_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	flexShrink: 0,
};

export const FIELD_VALUE_STYLE: CSSProperties = {
	color: "var(--oc-text)",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	textAlign: "right",
};

export const EMPTY_STYLE: CSSProperties = {
	margin: 0,
	color: "var(--oc-text-muted)",
};

/** A list row (a subagent, an MCP server, a changed file). */
export const ROW_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
	minWidth: 0,
};

export const ROW_DETAIL_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
};

/** A subagent row's open control (M2.19): the row's own layout, as a `<button>`. */
export const ROW_OPEN_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
	minWidth: 0,
	textAlign: "left",
};

/** The interrupt control a **running** subagent row offers (M2.19). */
export const ROW_INTERRUPT_STYLE: CSSProperties = {
	alignSelf: "flex-start",
	fontSize: "var(--oc-font-size-meta)",
};

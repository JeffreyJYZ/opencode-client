import type { CSSProperties } from "react";

/**
 * The banner band's look (M4.20): a persistent full-width row in the shell's own
 * column flow — **not** a fixed overlay, the way the toast stack is — so it pushes
 * the app down instead of covering it. Tokens only, so both themes are this one
 * file.
 */

/** The stack: in flow, full width, one band per notice. */
export const BANNER_STACK_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
};

/** One banner: a raised band with a warning edge, the shape `OfflineBanner` uses. */
export const BANNER_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: "var(--oc-space-3)",
	padding: "var(--oc-space-2) var(--oc-space-4)",
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	borderBottom: "1px solid var(--oc-warn)",
};

/** The dismiss: a bare control, the same shape a toast's uses. */
export const BANNER_DISMISS_STYLE: CSSProperties = {
	background: "transparent",
	color: "var(--oc-text-muted)",
	border: "none",
	borderRadius: "var(--oc-radius)",
	cursor: "pointer",
	padding: "0 var(--oc-space-1)",
	outlineColor: "var(--oc-focus)",
};

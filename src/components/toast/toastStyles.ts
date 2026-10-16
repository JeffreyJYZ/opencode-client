import type { CSSProperties } from "react";
import { LAYER } from "@/constants/layers";

/**
 * The toast stack's look (M5.2). Tokens only, so both themes are this one file: a
 * raised surface, the panel radius, and the toast layer above every menu.
 */

/** The stack: bottom-right, above the app, never a click target itself. */
export const TOAST_STACK_STYLE: CSSProperties = {
	position: "fixed",
	right: "var(--oc-space-4)",
	bottom: "var(--oc-space-4)",
	zIndex: LAYER.toast,
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-2)",
	maxWidth: "var(--oc-content-max-width)",
	pointerEvents: "none",
};

/** One toast: a raised panel that **is** a click target (its dismiss). */
export const TOAST_STYLE: CSSProperties = {
	pointerEvents: "auto",
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-3)",
	padding: "var(--oc-space-2) var(--oc-space-3)",
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius-panel)",
};

/** The dismiss: a bare control in the meta step, the same shape a menu item uses. */
export const TOAST_DISMISS_STYLE: CSSProperties = {
	background: "transparent",
	color: "var(--oc-text-muted)",
	border: "none",
	borderRadius: "var(--oc-radius)",
	cursor: "pointer",
	padding: "0 var(--oc-space-1)",
	outlineColor: "var(--oc-focus)",
};

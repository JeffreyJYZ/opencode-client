import type { CSSProperties } from "react";
import { LAYER } from "@/constants/layers";

/**
 * The modal sink's look (M4.20): the same scrim and raised panel the app's other
 * dialogs use, so a plugin's notice is not a second visual language. Tokens only,
 * so both themes are this one file.
 */

/** The scrim: the app's modal overlay, above the app and below the toast stack. */
export const MODAL_OVERLAY_STYLE: CSSProperties = {
	position: "fixed",
	inset: 0,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	background: "var(--oc-scrim)",
	zIndex: LAYER.overlay,
};

export const MODAL_DIALOG_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-3)",
	width: "min(480px, 90vw)",
	padding: "var(--oc-space-4)",
	background: "var(--oc-surface)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius-panel)",
};

export const MODAL_MESSAGE_STYLE: CSSProperties = {
	margin: 0,
};

export const MODAL_ACTIONS_STYLE: CSSProperties = {
	display: "flex",
	justifyContent: "flex-end",
	gap: "var(--oc-space-2)",
};

/** An action button: the raised shape the offline banner's retry uses. */
export const MODAL_ACTION_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-3)",
	cursor: "pointer",
	outlineColor: "var(--oc-focus)",
};

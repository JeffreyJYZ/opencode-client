import type { CSSProperties } from "react";
import { LAYER } from "@/constants/layers";

/**
 * The context menu's look (spec 030 §Tokens): colours, radii and spaces come from
 * the theme's custom properties, and the stacking order from `LAYER` — never a
 * literal, so both themes are the same file. The focus ring is the one the palette
 * and the picker already use, inherited from the webview's own outline.
 */

/**
 * The click-swallowing backdrop. It paints nothing and covers the window, so a
 * click outside closes the menu **without** reaching whatever sits underneath
 * (requirement 4): the surface below a menu is never a second click target.
 *
 * A real `<button>`, not a `role="button"` div: it is a control (the dismiss
 * affordance) and a button is what a control is. It is `tabindex="-1"`, so it is
 * never a Tab stop — the focus trap in `ContextMenu` owns the tab order.
 */
export const MENU_BACKDROP_STYLE: CSSProperties = {
	position: "fixed",
	inset: 0,
	zIndex: LAYER.contextMenu,
	margin: 0,
	padding: 0,
	border: "none",
	cursor: "default",
	background: "transparent",
};

/** The panel: a raised surface, a hairline border, and no width of its own idea. */
export const MENU_STYLE: CSSProperties = {
	position: "fixed",
	zIndex: LAYER.contextMenu,
	display: "flex",
	flexDirection: "column",
	minWidth: "max-content",
	padding: "var(--oc-space-1)",
	background: "var(--oc-surface-raised)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius-panel)",
};

/** One item: a full-width button, so the pointer and the keyboard share a target. */
export const MENU_ITEM_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: "var(--oc-space-3)",
	background: "transparent",
	color: "var(--oc-text)",
	border: "none",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-2)",
	cursor: "pointer",
	textAlign: "left",
	outlineColor: "var(--oc-focus)",
};

/** An item that cannot act right now keeps its place **and** its chord, dimmed. */
export const MENU_ITEM_DISABLED_STYLE: CSSProperties = {
	...MENU_ITEM_STYLE,
	color: "var(--oc-text-muted)",
	cursor: "default",
};

export const MENU_ITEM_LABEL_STYLE: CSSProperties = {
	whiteSpace: "nowrap",
};

/** The chord, right-aligned: the same label the keymap help prints. */
export const MENU_ACCEL_STYLE: CSSProperties = {
	...MENU_ITEM_LABEL_STYLE,
	color: "var(--oc-text-muted)",
};

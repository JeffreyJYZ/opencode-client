import type { CSSProperties } from "react";
import { LAYER } from "@/constants/layers";

/**
 * The composer's and the docks' surfaces (M2.5/M2.6; spec 020 §Prompt box, §Docks).
 * Tokens only: a raw colour, size or stacking value here would be a second copy of
 * spec 030's scale, and the theme guard refuses a hex outside `src/theme`.
 *
 * The box is the content-width column the transcript rows use, so the composer sits
 * under the transcript it belongs to; the docks take the same slot with an accent
 * rail (`--oc-warn`, the same tone the queued rail uses for "waiting on a human").
 */

/** The box's outer block: pinned below the transcript, never scrolling itself. */
export const COMPOSER_FRAME_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-2)",
	width: "100%",
	maxWidth: "var(--oc-content-max-width)",
	margin: "0 auto",
	padding: "var(--oc-space-3) var(--oc-space-4) var(--oc-space-4)",
};

/** The bordered surface: raised-high, one hairline, a left rail. */
export const COMPOSER_BOX_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-2)",
	position: "relative",
	background: "var(--oc-surface-raised-high)",
	border: "var(--oc-hairline) solid var(--oc-border)",
	borderLeftWidth: "3px",
	borderLeftColor: "var(--oc-prompt-rail)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-3)",
};

/** The rail says a turn is running, so the box and the interrupt read as one state. */
export const COMPOSER_RUNNING_STYLE: CSSProperties = {
	...COMPOSER_BOX_STYLE,
	borderLeftColor: "var(--oc-accent)",
};

export const COMPOSER_INPUT_STYLE: CSSProperties = {
	background: "transparent",
	color: "var(--oc-text)",
	border: "none",
	outlineColor: "var(--oc-focus)",
	resize: "none",
	minHeight: "var(--oc-space-8)",
	maxHeight: "30vh",
	overflowY: "auto",
	fontSize: "var(--oc-font-ui-size)",
};

/** The identity line and the button row share one meta scale (spec 020 §Prompt box). */
export const COMPOSER_LINE_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	flexWrap: "wrap",
	gap: "var(--oc-space-2)",
	fontSize: "var(--oc-font-size-meta)",
	color: "var(--oc-text-muted)",
};

export const COMPOSER_CONTROL_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "var(--oc-hairline) solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-2)",
	fontSize: "var(--oc-font-size-meta)",
	outlineColor: "var(--oc-focus)",
};

/** The menu: above its own box, in the strip's layer, over the transcript. */
export const COMPOSER_MENU_STYLE: CSSProperties = {
	position: "absolute",
	bottom: "100%",
	left: 0,
	right: 0,
	zIndex: LAYER.stripMenu,
	display: "flex",
	flexDirection: "column",
	maxHeight: "40vh",
	overflowY: "auto",
	background: "var(--oc-surface)",
	border: "var(--oc-hairline) solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1)",
};

export const COMPOSER_ROW_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "baseline",
	gap: "var(--oc-space-2)",
	padding: "var(--oc-space-1) var(--oc-space-2)",
	borderRadius: "var(--oc-radius)",
	color: "var(--oc-text)",
	fontSize: "var(--oc-font-size-meta)",
};

export const COMPOSER_ROW_ACTIVE_STYLE: CSSProperties = {
	...COMPOSER_ROW_STYLE,
	background: "var(--oc-surface-raised)",
};

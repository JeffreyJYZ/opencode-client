import type { CSSProperties } from "react";
import { COMPOSER_BOX_STYLE } from "@/components/composer/composerStyles";

/**
 * The docks' surfaces (M2.6; spec 020 §Docks): the same column and frame as the
 * composer with the warn rail, plus the dock's own headings, text, code, options and
 * error tone. Split from `composerStyles.ts` so the two surfaces that must *match*
 * (box and dock) sit beside the frame they share, and the docks' own vocabulary is
 * one file.
 */

/**
 * The dock's slot: the composer's own frame, the warn rail, the key line at the foot
 * — a dock replaces the box, so it wears the box's shape.
 */
export const DOCK_FRAME_STYLE: CSSProperties = {
	...COMPOSER_BOX_STYLE,
	borderLeftColor: "var(--oc-warn)",
	gap: "var(--oc-space-3)",
};

/** A dock's section heading and body, indented one step from the rail. */
export const DOCK_HEADING_STYLE: CSSProperties = {
	margin: 0,
	fontSize: "var(--oc-font-size-heading)",
	color: "var(--oc-text)",
};

export const DOCK_TEXT_STYLE: CSSProperties = {
	margin: 0,
	fontSize: "var(--oc-font-ui-size)",
	color: "var(--oc-text)",
	whiteSpace: "pre-wrap",
	overflowWrap: "anywhere",
};

export const DOCK_CODE_STYLE: CSSProperties = {
	margin: 0,
	fontSize: "var(--oc-font-code-size)",
	color: "var(--oc-text-muted)",
	whiteSpace: "pre-wrap",
	overflowWrap: "anywhere",
};

export const DOCK_ERROR_STYLE: CSSProperties = {
	...DOCK_TEXT_STYLE,
	color: "var(--oc-danger)",
};

/** The selected row of a form's option list, and its unselected sibling. */
export const DOCK_OPTION_STYLE: CSSProperties = {
	...DOCK_TEXT_STYLE,
	padding: "var(--oc-space-1) var(--oc-space-2)",
	borderRadius: "var(--oc-radius)",
	color: "var(--oc-text)",
};

export const DOCK_OPTION_SELECTED_STYLE: CSSProperties = {
	...DOCK_OPTION_STYLE,
	background: "var(--oc-surface-raised)",
	outline: "var(--oc-hairline) solid var(--oc-accent)",
};

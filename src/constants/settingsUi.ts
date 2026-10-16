import type { CSSProperties } from "react";

/**
 * The styles the settings sections share (M1.6's registry, M3.2's second
 * section): a section frame, a stacked label, and the input/button pair. Every
 * value is a theme token, so a section adds no colour of its own.
 */

export const SECTION_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-3)",
	maxWidth: "var(--oc-content-max-width)",
	padding: "var(--oc-space-4)",
};

export const LABEL_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
	color: "var(--oc-text-muted)",
};

/**
 * The section heading (M4.11): the surface draws the registry's `label` as the
 * section's `<h2>`, so a section body never carries its own title. A token, not a
 * literal, so the heading follows the interface font size the user chose.
 */
export const SECTION_HEADING_STYLE: CSSProperties = {
	margin: 0,
	fontSize: "var(--oc-font-size-heading)",
	color: "var(--oc-text)",
};

export const INPUT_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-2)",
};

export const BUTTON_STYLE: CSSProperties = {
	...INPUT_STYLE,
	cursor: "pointer",
};

/**
 * The surface's frame (M3.5): the column the registered sections render in. It
 * owns the scroll — a settings list grows past the window — so a section never
 * has to; the sections keep their own padding and measure (`SECTION_STYLE`).
 */
export const SURFACE_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	overflowY: "auto",
	overflowWrap: "anywhere",
	flex: "1 1 0%",
	minHeight: 0,
	color: "var(--oc-text)",
};

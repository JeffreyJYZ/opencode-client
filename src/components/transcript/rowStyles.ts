import type { CSSProperties } from "react";
import { ROW_ID_ATTR } from "@/constants/transcriptUi";

/**
 * The styles every transcript row shares (M2.2). Tokens only — a raw colour,
 * size or space here would be a second copy of spec 030's scale.
 *
 * **No row declares a text face.** The two faces reach a row structurally: the
 * interface face is the document default (`base.css` sets it on `body`), and the
 * code face comes from the `<code>`/`<pre>` elements the row uses, which
 * `base.css` maps to `--oc-font-code`. Declaring one here would be a second copy
 * of a face, and `fontGuard.test.ts` refuses that outside `src/theme`.
 *
 * The row is a **content-width block**, not a row of a grid: nothing in the
 * layout measures a glyph (spec 030 §How a font is applied), so the same markup
 * holds in a proportional and a mono face. Long text is the deliverable's real
 * overflow case, so text wraps (`pre-wrap` keeps the server's own whitespace,
 * `anywhere` stops a single long token from widening the page).
 */

/** The row's outer block: a column, centred at the content width. */
export const ROW_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
	width: "100%",
	maxWidth: "var(--oc-content-max-width)",
	margin: "0 auto",
	padding: "var(--oc-space-2) var(--oc-space-4)",
};

/** The interface face at the interface size: prose, and a row's own words. */
export const TEXT_STYLE: CSSProperties = {
	fontSize: "var(--oc-font-ui-size)",
	whiteSpace: "pre-wrap",
	overflowWrap: "anywhere",
	margin: 0,
};

/** The interface face one step down: labels, statuses, a footer, reasoning. */
export const META_STYLE: CSSProperties = {
	...TEXT_STYLE,
	fontSize: "var(--oc-font-size-meta)",
	color: "var(--oc-text-muted)",
};

/** The code face's own metrics, for a `<code>`/`<pre>` — the face itself is base.css's. */
export const CODE_STYLE: CSSProperties = {
	fontSize: "var(--oc-font-code-size)",
	whiteSpace: "pre-wrap",
	overflowWrap: "anywhere",
	margin: 0,
};

/** A row's head line: its kind word, its subject, its status — wrapping, never clipped. */
export const HEAD_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "baseline",
	flexWrap: "wrap",
	gap: "var(--oc-space-2)",
};

/** A tool's anchor, or a subagent's child session: code face, one step down in tone. */
export const ANCHOR_STYLE: CSSProperties = {
	...CODE_STYLE,
	color: "var(--oc-text-muted)",
};

/**
 * A tool's or shell's output block — **the M2.4 seam**: the caps (`(N more lines)`)
 * and the expand/collapse affordance land here, at the element that already holds
 * the whole string. Nothing in M2.2 shortens it.
 */
export const OUTPUT_STYLE: CSSProperties = {
	...CODE_STYLE,
	marginTop: "var(--oc-space-1)",
};

/**
 * A row's identity, written to the DOM as `data-row`.
 *
 * One call site for every family, so no component derives an id of its own and
 * an append test can hold the node reference the attribute names.
 */
export function rowIdentity(id: string): Record<string, string> {
	return { [ROW_ID_ATTR]: id };
}

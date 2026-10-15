import type { CSSProperties } from "react";

/**
 * The style the three placeholder surfaces share, so none of them holds a token
 * value of its own and all three use the theme the app already defines.
 *
 * M1.2/M2.x/M3.5 replace the pages themselves, and this constant goes with them.
 */
export const PLACEHOLDER_STYLE: CSSProperties = {
	color: "var(--oc-text)",
	padding: "var(--oc-space-4)",
};

/**
 * The session surface's frame (M2.2). Flow only on purpose: the transcript's own
 * scrolling — tail-follow, unpinning, per-tab memory — is M2.9's, and a page that
 * claimed the scroll now would have to give it back.
 *
 * The horizontal space belongs to the rows' own content-width column
 * (`TranscriptView`), so the surface adds none of its own.
 */
export const SESSION_PAGE_STYLE: CSSProperties = {
	color: "var(--oc-text)",
	padding: 0,
};

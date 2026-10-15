import type { CSSProperties } from "react";

/**
 * The style the three placeholder surfaces share, so none of them holds a token
 * value of its own and all three use the theme the app already defines.
 *
 * M1.2/M2.x/M3.5 replace the pages themselves, and this constant goes with them.
 */
export const PLACEHOLDER_STYLE: CSSProperties = {
	color: "var(--oc-text)",
	fontFamily: "var(--oc-font-ui)",
	fontSize: "var(--oc-font-ui-size)",
	padding: "var(--oc-space-4)",
};

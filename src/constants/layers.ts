/**
 * Stacking layers (spec 030 §Theme: a component names a value, never a literal).
 * Higher paints above lower; a tie is broken by DOM order.
 */

export const LAYER = {
	/** The tab strip's overflow menu, inside the nav row. */
	stripMenu: 1,
	/** A modal overlay above the app content: the new-session flow and picker. */
	overlay: 50,
} as const;

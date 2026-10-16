/**
 * What counts as an **open overlay** (spec 010 §Desktop behaviours).
 *
 * The app's `window` key handlers must all agree on it — the palette's and
 * settings' chords (`app/keymap.ts`), the tab strip's (`app/tabKeys.ts`) and the
 * transcript's band chords (`components/transcript/bandNav.ts`) — so the selector
 * and the query live here rather than as a private copy per handler that could
 * drift. It is **not** a concern of the *surface*-matched chords (the composer's
 * ⌘↩ and `Esc`, a region's ⇧F10): focus cannot reach their element through a
 * modal, so they never see the press at all.
 */

/** Any open overlay dialog: the palette, the session picker, the new-session flow. */
export const OVERLAY_SELECTOR = '[role="dialog"]';

/** Whether an overlay is open right now. Read per keypress, never captured. */
export function overlayOpen(): boolean {
	return document.querySelector(OVERLAY_SELECTOR) !== null;
}

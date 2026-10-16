import { COMMAND_PALETTE_EVENT, NEW_SESSION_EVENT, SESSION_PICKER_EVENT } from "@/constants/tabs";

/**
 * The strip's outward signals — the `+`/`⌕`/palette affordances, dispatched rather
 * than faked. They were the tail of `tabSync.ts`, which overran the 150-line cap
 * once two branches' work met in a merge; they reference nothing in `tabSync`, so
 * they moved here whole and `tabSync` re-exports them for their existing callers.
 */

/**
 * The `+` button and ⌘T's signal. M1.3 listens for it and creates the session;
 * here it is the affordance, documented rather than faked.
 */
export function requestNewSession(): void {
	window.dispatchEvent(new CustomEvent(NEW_SESSION_EVENT));
}

/** The `⌕` button's signal; M1.4's picker listens for it. */
export function requestSessionPicker(): void {
	window.dispatchEvent(new CustomEvent(SESSION_PICKER_EVENT));
}

/** The ⌘K palette's signal; the palette toggles on it and closes the other overlays. */
export function requestCommandPalette(): void {
	window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));
}

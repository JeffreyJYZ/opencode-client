import { useEffect, useState } from "react";
import { SIDEBAR_NARROW_MEDIA_QUERY } from "@/constants/settings";

/**
 * The viewport side of the sidebar's visibility rule (M2.25, spec 020 §Sidebar):
 * a window narrower than the breakpoint hides the sidebar unless the user toggled
 * it open in that state.
 *
 * The viewport is read through `window.matchMedia` — the one seam the rule is
 * about — so a test drives it by replacing `matchMedia`, never by faking a style.
 * `isNarrowViewport` reads it fresh for the keymap's toggle (which has no React
 * around it); `useNarrowViewport` subscribes for the panel that must re-render
 * when a resize crosses the breakpoint.
 */

/** Is the viewport narrower than the breakpoint right now? No subscription. */
export function isNarrowViewport(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
	return window.matchMedia(SIDEBAR_NARROW_MEDIA_QUERY).matches;
}

/** Subscribe to the breakpoint crossing; the value the Sidebar renders from. */
export function useNarrowViewport(): boolean {
	const [narrow, setNarrow] = useState(isNarrowViewport);
	useEffect(() => {
		if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
		const query = window.matchMedia(SIDEBAR_NARROW_MEDIA_QUERY);
		const onChange = () => setNarrow(query.matches);
		query.addEventListener("change", onChange);
		return () => query.removeEventListener("change", onChange);
	}, []);
	return narrow;
}

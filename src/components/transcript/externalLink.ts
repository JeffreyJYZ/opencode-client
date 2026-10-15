import { EXTERNAL_SCHEMES, OPEN_EXTERNAL_EVENT } from "@/constants/markdown";

/**
 * Where a markdown link goes (M2.3).
 *
 * A rendered link must **never navigate the webview**: the shell refuses a
 * foreign origin outright (M0.2b), and a same-origin navigation would reload the
 * whole app. So every click is intercepted; only a link that really leaves the
 * app is handed to the host, through the same window-event signal shape the nav
 * uses. Opening it in the OS browser is the host's half (M5.2 wires it).
 */

/** Whether an href leaves the app. A fragment, a relative path or the app's own origin does not. */
export function isExternalHref(href: string): boolean {
	const trimmed = href.trim();
	if (trimmed === "" || trimmed.startsWith("#")) return false;
	let url: URL;
	try {
		url = new URL(trimmed, window.location.href);
	} catch {
		return false;
	}
	if (!(EXTERNAL_SCHEMES as readonly string[]).includes(url.protocol)) return false;
	return url.protocol === "mailto:" || url.origin !== window.location.origin;
}

/** Hand an external href to the host. The webview does not move. */
export function openExternal(href: string): void {
	window.dispatchEvent(new CustomEvent(OPEN_EXTERNAL_EVENT, { detail: href }));
}

import { pushToast } from "@/components/toast/toastStore";
import { OPEN_EXTERNAL_EVENT } from "@/constants/markdown";
import { TOAST_LINK_FAILED, TOAST_ROLE } from "@/constants/native";
import { openExternalUrl } from "@/native/openExternal";

/**
 * The shell's half of "open this link outside the app" (M5.2).
 *
 * M2.3 already decided, in one place, **which** links leave the app
 * (`src/components/transcript/externalLink.ts`) and raised `oc:open-external` for
 * them; nothing was listening. This is the listener: it hands the href to the
 * shell's opener and, if the shell refuses it, says so in a toast rather than
 * dropping it silently.
 *
 * Installed once by the shell, and returned as its own cleanup so a StrictMode
 * remount cannot leave two listeners on the event.
 */

/** Whether `detail` is a usable href — the event's payload is untrusted. */
function hrefOf(detail: unknown): string | null {
	return typeof detail === "string" && detail.trim() !== "" ? detail : null;
}

export function installExternalLinks(): () => void {
	const onOpenExternal = (event: Event): void => {
		const href = hrefOf((event as CustomEvent<unknown>).detail);
		if (href === null) return;
		void openExternalUrl(href).then((opened) => {
			if (!opened) pushToast(TOAST_LINK_FAILED, TOAST_ROLE.alert);
		});
	};
	window.addEventListener(OPEN_EXTERNAL_EVENT, onOpenExternal);
	return () => window.removeEventListener(OPEN_EXTERNAL_EVENT, onOpenExternal);
}

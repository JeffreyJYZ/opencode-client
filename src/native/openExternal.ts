import { invoke, isTauri } from "@tauri-apps/api/core";
import { NATIVE_COMMAND } from "@/constants/native";

/**
 * The one seam over the shell's URL opener (M5.2). The **decision** lives in the
 * shell (`src-tauri/src/native.rs::is_openable_url`, one place, refusal logged), so
 * this module never re-implements it: it hands the href over and reports the answer.
 *
 * The web build has no shell to hand it to, so a new tab is the only honest
 * hand-off — and it is only ever reached for a link the app already decided leaves
 * the app (`src/components/transcript/externalLink.ts`).
 */

/** Hand `href` to the OS browser. `false` means the shell refused it or failed. */
export async function openExternalUrl(href: string): Promise<boolean> {
	if (isTauri()) {
		try {
			const opened = await invoke<boolean>(NATIVE_COMMAND.openExternal, { url: href });
			return opened === true;
		} catch {
			return false;
		}
	}
	return window.open(href, "_blank", "noopener,noreferrer") !== null;
}

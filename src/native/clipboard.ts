import { isTauri } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";

/**
 * The one seam over the host's clipboard (M5.2).
 *
 * In the shell the copy goes through `tauri-plugin-clipboard-manager`, whose
 * `clipboard-manager:allow-write-text` capability is what the page needs: a build
 * **without** that permission fails here, visibly, instead of pretending — the
 * caller turns `false` into a toast. On the web build there is no shell, so the
 * browser's own Clipboard API is the honest fallback; a refused or absent one is
 * the same `false`.
 *
 * Nothing here throws: a copy the user can redo is not worth a crash, but it is
 * worth saying out loud.
 */

/** Copy `value`. `false` means the clipboard refused it or is not there at all. */
export async function copyText(value: string): Promise<boolean> {
	try {
		if (isTauri()) {
			await writeText(value);
			return true;
		}
		await navigator.clipboard.writeText(value);
		return true;
	} catch {
		return false;
	}
}

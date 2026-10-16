import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";

/**
 * The self-update seam (spec 010 §Desktop behaviours, M5.4). The page asks the
 * shell whether a newer release exists; the shell's half is
 * `tauri-plugin-updater`, configured entirely by the `plugins.updater` block of
 * `tauri.conf.json` (endpoint and public key), so nothing here names a url.
 *
 * A check that cannot run is a **state, not an error**: the web build has no
 * updater at all, and a desktop build with no release host answers with nothing.
 * So this never throws — a failed check is reported and changes nothing.
 */

export type UpdateCheck =
	| { readonly kind: "unsupported" }
	| { readonly kind: "current" }
	| { readonly kind: "available"; readonly version: string }
	| { readonly kind: "failed" };

/** Ask the shell whether a newer release exists. */
export async function checkForUpdate(): Promise<UpdateCheck> {
	if (!isTauri()) return { kind: "unsupported" };
	try {
		const update = await check();
		if (update === null) return { kind: "current" };
		return { kind: "available", version: update.version };
	} catch {
		return { kind: "failed" };
	}
}

import { isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

/**
 * The one seam over the host's native directory dialog (spec 040 §The host,
 * `host.native.pickDirectory`). Everything else in the app asks for a directory
 * through this module; no other file imports a Tauri API.
 */

export type DirectoryPicker = (defaultPath?: string) => Promise<string | null>;

/** Whether this build can open the native dialog. False on the web build, so the
 *  flow degrades to a text path input instead of pretending. */
export function isNativeDirectoryPickerAvailable(): boolean {
	return isTauri();
}

/** Native implementation. Cancelling the dialog resolves `null`. */
export async function pickDirectoryNative(defaultPath?: string): Promise<string | null> {
	const selected = await open({ directory: true, defaultPath });
	if (Array.isArray(selected)) return selected[0] ?? null;
	return selected;
}

/** Default picker used when nothing is injected (production + dev). On web it is
 *  a no-op that resolves `null` so callers can fall back to text input. */
export const defaultDirectoryPicker: DirectoryPicker = async (defaultPath) => {
	if (!isNativeDirectoryPickerAvailable()) return null;
	return pickDirectoryNative(defaultPath);
};

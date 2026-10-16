import { invoke, isTauri } from "@tauri-apps/api/core";
import { NATIVE_COMMAND } from "@/constants/native";

/**
 * The one seam over the shell's image read (M2.24). The shell owns the decision —
 * which path may be read, and how large — so this module only hands it a path and
 * reports the base64 it returned.
 *
 * The web build has no shell to read a local file, so it answers `null` rather
 * than pretending: the strip then shows the named refusal, which is the honest
 * state for a build that cannot preview.
 */

/** The base64 of the image at `path`, or `null` when it cannot be read. */
export async function readImageBase64(path: string): Promise<string | null> {
	if (!isTauri()) return null;
	try {
		return await invoke<string>(NATIVE_COMMAND.readImage, { path });
	} catch {
		return null;
	}
}

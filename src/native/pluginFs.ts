import { invoke, isTauri } from "@tauri-apps/api/core";
import { NATIVE_FS_COMMAND } from "@/constants/native";
import type { NativeFs } from "@/plugins/services/native";

/**
 * The shell's filesystem behind `native` (M4.16): the app's `NativeFs` adapter
 * (`src/plugins/services/native.ts`), one command per port method. The **shell**
 * owns the decision — every path is scoped to `plugin-data/<id>/` and `safe_id`
 * guards the id (`src-tauri/src/native/fs.rs`) — so this module only carries the
 * path over and reports the answer, and a refusal rejects exactly as a missing file
 * does.
 *
 * The command names are the seam: the Rust half writes the same strings and its
 * tests read `src/constants/native.ts`, so a rename on either side fails a test.
 */

/** How one command reaches the shell; the test seam for the adapter. */
export type NativeSend = (command: string, args: Record<string, unknown>) => Promise<unknown>;

const tauriSend: NativeSend = (command, args) => invoke(command, args);

export function createNativeFs(send: NativeSend = tauriSend): NativeFs {
	return {
		realpath: async (path) => (await send(NATIVE_FS_COMMAND.realpath, { path })) as string,
		readText: async (path) => (await send(NATIVE_FS_COMMAND.readText, { path })) as string,
		writeText: async (path, value) => {
			await send(NATIVE_FS_COMMAND.writeText, { path, value });
		},
		list: async (dir) =>
			(await send(NATIVE_FS_COMMAND.list, { path: dir })) as readonly string[],
		remove: async (path) => {
			await send(NATIVE_FS_COMMAND.remove, { path });
		},
		mkdirp: async (dir) => {
			await send(NATIVE_FS_COMMAND.mkdirp, { path: dir });
		},
	};
}

/**
 * The app data root `plugin-data/<id>/` lives under, or `null` on the web — where
 * there is no shell and `native` is `null` by design. This is the one value the
 * host's `NativeDeps` needs beyond the adapter itself.
 */
export async function pluginDataRoot(): Promise<string | null> {
	if (!isTauri()) return null;
	return (await invoke<string>(NATIVE_FS_COMMAND.dataRoot)) || null;
}

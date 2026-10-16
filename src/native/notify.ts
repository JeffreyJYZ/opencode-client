import { invoke, isTauri } from "@tauri-apps/api/core";
import { NATIVE_COMMAND } from "@/constants/native";

/**
 * The one seam over the shell's turn-end notification (M5.2).
 *
 * The shell owns the whole thing: it asks for permission **once**, stays inert if
 * it is refused, and logs what it did. This module only asks it to notify — the
 * decision of *when* (unfocused, and a turn that really ended) is
 * `src/app/turnEndNotification.ts`.
 */

/** Ask the shell to post the turn-end notification. `false` is a refusal or no shell. */
export async function notifyTurnEnd(): Promise<boolean> {
	if (!isTauri()) return false;
	try {
		const shown = await invoke<boolean>(NATIVE_COMMAND.notifyTurnEnd);
		return shown === true;
	} catch {
		return false;
	}
}

import { invoke, isTauri } from "@tauri-apps/api/core";
import { NATIVE_COMMAND } from "@/constants/native";

/**
 * The one seam over the shell's editor opener (M5.2). The shell owns the decision —
 * which editor, and whether the path is one it may open — so this module only hands
 * it a path and a line and reports what came back.
 *
 * The web build has no editor to open: it answers `false` rather than pretending,
 * which is what makes the row's button inert there.
 */

export type EditorTarget = {
	readonly path: string;
	readonly line: number;
};

/** Whether this build can open a file in the machine's editor. */
export function isEditorAvailable(): boolean {
	return isTauri();
}

/** Ask the shell to open `target` in the configured editor. `false` is a refusal. */
export async function openInEditor(target: EditorTarget): Promise<boolean> {
	if (!isTauri()) return false;
	try {
		const opened = await invoke<boolean>(NATIVE_COMMAND.openInEditor, {
			path: target.path,
			line: target.line,
		});
		return opened === true;
	} catch {
		return false;
	}
}

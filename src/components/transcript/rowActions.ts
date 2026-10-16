import { pushToast } from "@/components/toast/toastStore";
import {
	TOAST_COPIED,
	TOAST_COPY_FAILED,
	TOAST_EDITOR_FAILED,
	TOAST_ROLE,
} from "@/constants/native";
import { copyText } from "@/native/clipboard";
import { openInEditor } from "@/native/editor";
import type { RowEditorTarget } from "./rowCopy";

/**
 * The two native actions a transcript row (or a code block) can run (M5.2). One
 * function each, so the row's button and the row's menu item run the **same** call
 * and cannot drift.
 *
 * Both answer out loud: a copy the clipboard refused and an editor the shell could
 * not open each raise a toast, because a button that does nothing is worse than one
 * that says it could not.
 */

/** Copy `text`, and say what happened. */
export async function copyToClipboard(text: string): Promise<void> {
	const copied = await copyText(text);
	pushToast(
		copied ? TOAST_COPIED : TOAST_COPY_FAILED,
		copied ? TOAST_ROLE.status : TOAST_ROLE.alert,
	);
}

/** Open `target` in the machine's editor; a refusal is said out loud. */
export async function openEditorTarget(target: RowEditorTarget): Promise<void> {
	const opened = await openInEditor(target);
	if (!opened) pushToast(TOAST_EDITOR_FAILED, TOAST_ROLE.alert);
}

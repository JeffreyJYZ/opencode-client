import { COPY_LABEL, OPEN_IN_EDITOR_LABEL } from "@/constants/native";
import { copyToClipboard, openEditorTarget } from "./rowActions";
import type { RowEditorTarget } from "./rowCopy";
import { ACTION_STYLE } from "./rowStyles";

/**
 * The two affordances a row (or a code block) draws (M5.2). Thin by design: each is
 * one button over one `rowActions` call, so the pointer route and the context-menu
 * route run the same code and neither owns a rule of its own.
 */

/** Copy the text it was handed — the row's own, or a fence's. */
export function CopyButton({ text }: { readonly text: string }) {
	return (
		<button type="button" style={ACTION_STYLE} onClick={() => void copyToClipboard(text)}>
			{COPY_LABEL}
		</button>
	);
}

/** Open the file the row anchored on. The `title` names the whole path. */
export function EditorButton({ target }: { readonly target: RowEditorTarget }) {
	return (
		<button
			type="button"
			style={ACTION_STYLE}
			title={target.path}
			onClick={() => void openEditorTarget(target)}
		>
			{OPEN_IN_EDITOR_LABEL}
		</button>
	);
}

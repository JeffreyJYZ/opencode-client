import { Slot } from "@/components/Slot";
import { COPY_LABEL, OPEN_IN_EDITOR_LABEL } from "@/constants/native";
import { SLOT } from "@/constants/slots";
import { copyToClipboard, openEditorTarget } from "./rowActions";
import type { RowEditorTarget } from "./rowCopy";
import { ACTION_STYLE } from "./rowStyles";

/**
 * The two affordances a row (or a code block) draws (M5.2). Thin by design: each is
 * one button over one `rowActions` call, so the pointer route and the context-menu
 * route run the same code and neither owns a rule of its own.
 *
 * `RowActions` is the strip a row renders (M4.12): the two built-ins, then whatever
 * a plugin registered for `transcript.row.actions`. It returns a fragment, so an
 * empty strip adds no node of its own — the header keeps exactly the children it
 * had before.
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

/** A row's action strip: the built-ins the row qualifies for, then the slot. */
export function RowActions({
	text,
	target,
}: {
	readonly text: string | null;
	readonly target: RowEditorTarget | null;
}) {
	return (
		<>
			{target !== null && <EditorButton target={target} />}
			{text !== null && <CopyButton text={text} />}
			<Slot id={SLOT.transcriptRowActions} />
		</>
	);
}

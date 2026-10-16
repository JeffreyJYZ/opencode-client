import { DEFAULT_EDITOR_LINE } from "@/constants/native";
import { ROW_KIND, TOOL_LINE_FIELD } from "@/constants/transcript";
import type { TranscriptRow } from "@/session/transcript";
import { footerText, inputField } from "./rowModel";

/**
 * What a transcript row offers the two native affordances (M5.2): the text a copy
 * takes, and the file+line an editor opens.
 *
 * Both are **pure derivations of the row**, so a button and a menu item cannot
 * disagree, and neither can invent a target: the copy text is the row's own text
 * (never a re-render of it), and the editor target is the row's **anchor** — the
 * path M2.1 extracted from the call's `path` field, so it is a path the session
 * actually touched, never a string a component made up.
 */

/** The text a row copies: its own content, or `null` when it has none to give. */
export function rowCopyText(row: TranscriptRow): string | null {
	const text = copySource(row);
	return text === "" ? null : text;
}

function copySource(row: TranscriptRow): string {
	switch (row.kind) {
		case ROW_KIND.user:
			return row.text;
		case ROW_KIND.prose:
		case ROW_KIND.reasoning:
			return row.text.kept;
		case ROW_KIND.tool:
			// What the call produced, else what it was asked to do — a call that has
			// streamed only its input still has something worth copying.
			return row.output.kept === "" ? row.input : row.output.kept;
		case ROW_KIND.shell:
			return row.output.kept === "" ? row.command : row.output.kept;
		case ROW_KIND.error:
			return row.message;
		case ROW_KIND.notice:
			return row.text;
		case ROW_KIND.footer:
			return footerText(row);
	}
}

/** A file the editor may open: an absolute path, and the line to land on. */
export type RowEditorTarget = {
	readonly path: string;
	readonly line: number;
};

/**
 * The editor target a row names, or `null`.
 *
 * Only a tool row has one, and only when its anchor is **absolute**: a relative
 * anchor is not a path the shell could open, so the affordance is inert rather than
 * guessing a working directory. The line comes from the call's own `offset`; a call
 * that named no line, or an absurd one, opens at `DEFAULT_EDITOR_LINE`.
 */
export function rowEditorTarget(row: TranscriptRow): RowEditorTarget | null {
	if (row.kind !== ROW_KIND.tool) return null;
	const path = row.anchor;
	if (path === undefined || !path.startsWith("/")) return null;
	const offset = inputField(row, TOOL_LINE_FIELD);
	const line = offset === undefined ? Number.NaN : Number.parseInt(offset, 10);
	return { path, line: Number.isInteger(line) && line > 0 ? line : DEFAULT_EDITOR_LINE };
}

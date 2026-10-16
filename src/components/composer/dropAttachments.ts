import { COMPOSER_ATTACH_FALLBACK_TYPE, COMPOSER_ATTACH_TYPE } from "@/constants/composer";
import type { Attachment } from "@/session/promptTypes";

/**
 * What a drop carries (spec 010 §Desktop behaviours: "drag-and-drop files onto the
 * prompt box to attach"; spec 020 §Prompt box: "files ride the prompt payload's
 * `files[]` with `uri`").
 *
 * The payload carries **paths**, and nothing else is sendable: a browser `File`
 * object has no absolute path, so a drop that yields only names produces an entry
 * with no path — `sendable: false` — and the box refuses to send it, out loud,
 * before the prompt leaves (requirement 7). A webview delivers a real drop as a
 * `file://` URI (or a plain path) on the data transfer, which is what this reads.
 */

/** One dropped line to an attachment; `null` for a blank line. */
function attachmentFrom(uri: string, name?: string): Attachment | null {
	const value = uri.trim();
	if (value === "") return null;
	const withoutScheme = value.startsWith(FILE_SCHEME) ? value.slice(FILE_SCHEME.length) : value;
	return {
		uri: value,
		name: name ?? withoutScheme.split("/").at(-1) ?? withoutScheme,
		sendable: true,
	};
}

const FILE_SCHEME = "file://";

/** The shape of a drop this module reads — the DOM's own `DataTransfer`, narrowed. */
export type DropData = {
	readonly getData: (type: string) => string;
	readonly files?: {
		readonly length: number;
		readonly [index: number]: { readonly name: string };
	};
};

export function attachmentsFromDrop(data: DropData): readonly Attachment[] {
	const uriList = data.getData(COMPOSER_ATTACH_TYPE);
	const source = uriList.trim() === "" ? data.getData(COMPOSER_ATTACH_FALLBACK_TYPE) : uriList;
	const entries = source
		.split("\n")
		.map((line) => attachmentFrom(line))
		.filter((entry): entry is Attachment => entry !== null);
	if (entries.length > 0) return entries;
	// Nothing with a path: name what came instead, unsendable, so the box can say so.
	const names: Attachment[] = [];
	for (let index = 0; index < (data.files?.length ?? 0); index++) {
		const file = data.files?.[index];
		if (file === undefined) continue;
		names.push({ uri: "", name: file.name, sendable: false });
	}
	return names;
}

/**
 * The same entries from the **absolute paths** the shell hands over (M5.2).
 *
 * A Finder drop is handled by the OS, not by the webview's `DataTransfer`, so the
 * paths arrive as plain strings from the shell. Every one of them is a path, so
 * every entry is sendable — and it goes through `attachmentFrom`, the one function
 * that decides what an attachment is, so the native and the DOM route cannot
 * disagree about the name or the scheme.
 */
export function attachmentsFromPaths(paths: readonly string[]): readonly Attachment[] {
	const entries: Attachment[] = [];
	for (const path of paths) {
		const entry = attachmentFrom(path);
		if (entry !== null) entries.push(entry);
	}
	return entries;
}

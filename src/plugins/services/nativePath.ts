/**
 * The path rules `native` shares with Rust `safe_id` (spec 040 §Capabilities): a
 * plugin names a path **inside its own data directory** — never an absolute one,
 * never one climbing out with a parent segment. This module is the pure half; the
 * resolved half (a symlink that leaves the directory) needs the filesystem and
 * lives in `native.ts`.
 */

export const PATH_SEPARATOR = "/";
export const PARENT_SEGMENT = "..";

/** What is wrong with a plugin-named relative path, or `null` when nothing is. */
export function pathProblem(relative: unknown): string | null {
	if (typeof relative !== "string" || relative.trim() === "") return "an empty path";
	if (relative.startsWith(PATH_SEPARATOR)) return `an absolute path ("${relative}")`;
	if (relative.split(PATH_SEPARATOR).includes(PARENT_SEGMENT)) {
		return `a parent segment ("${relative}")`;
	}
	return null;
}

/** The directory a path lives in; the scope itself when the path has no separator. */
export function parentOf(path: string): string {
	const at = path.lastIndexOf(PATH_SEPARATOR);
	if (at <= 0) return at === 0 ? PATH_SEPARATOR : "";
	return path.slice(0, at);
}

/** Whether a resolved path is the scope itself or below it. Both are already resolved. */
export function isInside(root: string, target: string): boolean {
	return target === root || target.startsWith(`${root}${PATH_SEPARATOR}`);
}

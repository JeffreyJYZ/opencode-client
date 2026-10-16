/**
 * The host's native seam (M5.2): the shell's command names, the editor default and
 * every word the native integrations say. No component holds a literal, and the
 * **command names are the seam** — the Rust half (`src-tauri/src/native.rs`) writes
 * the same strings, and `native.rs`'s tests pin them so a rename cannot drift.
 *
 * `DEFAULT_EDITOR` is the one editor the shell opens a file in: a name on `PATH`,
 * never a shell command line (the Rust half spawns it with an **argument array**, so
 * a path with a space, a quote or a `;` can never become a command).
 */

/** The three commands the page invokes on the shell. */
export const NATIVE_COMMAND = {
	openExternal: "open_external",
	openInEditor: "open_in_editor",
	notifyTurnEnd: "notify_turn_end",
} as const;

/**
 * The seven commands the `native` service's filesystem port invokes (M4.16). The
 * Rust half (`src-tauri/src/native/fs/commands.rs`) writes the same strings and its
 * tests read this file, so a rename on either side fails a test.
 */
export const NATIVE_FS_COMMAND = {
	dataRoot: "native_data_root",
	realpath: "native_realpath",
	readText: "native_read_text",
	writeText: "native_write_text",
	list: "native_list",
	remove: "native_remove",
	mkdirp: "native_mkdirp",
} as const;

/** The window event the shell raises with the paths of a dropped file (M5.2). */
export const FILES_DROPPED_EVENT = "oc:files-dropped";

/** The editor a transcript row opens in, by name. Zed is this machine's editor. */
export const DEFAULT_EDITOR = "zed";

/** The line an editor target opens at when the row names no line. */
export const DEFAULT_EDITOR_LINE = 1;

/** The turn-end notification's two lines. */
export const NOTIFICATION_TITLE = "opencode client";
export const NOTIFICATION_BODY = "A turn finished";

/** A toast's ARIA role: an outcome is `status`, a failure is `alert`. */
export const TOAST_ROLE = {
	status: "status",
	alert: "alert",
} as const;

export type ToastRole = (typeof TOAST_ROLE)[keyof typeof TOAST_ROLE];

/** How long a toast stays before it dismisses itself. */
export const TOAST_TIMEOUT_MS = 4_000;

/** The toast's dismiss affordance, and the region's own name. */
export const TOAST_DISMISS_LABEL = "Dismiss";
export const TOAST_REGION_LABEL = "Notifications";

/** What a toast says. A failed copy is said out loud, never swallowed. */
export const TOAST_COPIED = "Copied";
export const TOAST_COPY_FAILED = "Copy failed — the clipboard refused it";
export const TOAST_EDITOR_FAILED = "Could not open the editor";
export const TOAST_LINK_FAILED = "Could not open the link";

/** The two row affordances. */
export const COPY_LABEL = "Copy";
export const OPEN_IN_EDITOR_LABEL = "Open in editor";

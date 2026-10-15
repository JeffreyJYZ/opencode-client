/**
 * The command palette's constants (spec 010 §Desktop behaviours: *Command palette
 * (⌘K)*). Every visible string, the ARIA ids, and the signal a command row emits
 * live here so no component holds a literal.
 */

/** What a row is: which of the four sources contributed it. */
export const PALETTE_KIND = {
	command: "command",
	session: "session",
	settings: "settings",
	tab: "tab",
} as const;

export type PaletteKind = (typeof PALETTE_KIND)[keyof typeof PALETTE_KIND];

/** The word a row's own source is labelled with, so a row says where it came from. */
export const PALETTE_KIND_LABEL = {
	[PALETTE_KIND.command]: "Command",
	[PALETTE_KIND.session]: "Session",
	[PALETTE_KIND.settings]: "Settings",
	[PALETTE_KIND.tab]: "Tab",
} as const;

/** The dialog and its search field. */
export const PALETTE_DIALOG_LABEL = "Command palette";
export const PALETTE_SEARCH_LABEL = "Search the palette";
export const PALETTE_SEARCH_PLACEHOLDER = "Search sessions, commands, settings and tabs";

/** One list id, so the field can name the list it drives with `aria-controls`. */
export const PALETTE_LIST_ID = "oc-command-palette-list";
export const PALETTE_LIST_LABEL = "Palette results";
export const PALETTE_OPTION_ID_PREFIX = "oc-command-palette-option-";

/** The honest states: a query that matched nothing, and a palette with no sources. */
export const PALETTE_NONE_LABEL = "Nothing matches";
export const PALETTE_EMPTY_LABEL = "Nothing to open yet";

/** The heading of the keymap help the palette renders (spec 010 §Desktop behaviours). */
export const PALETTE_HELP_LABEL = "Keyboard shortcuts";

/**
 * The window signal a command row emits on Enter. M1.6 lists and names it; the
 * command's runner (M2.5's composer, M4.4's client commands) binds it, so the row
 * is a named seam rather than a dead key.
 */
export const COMMAND_RUN_EVENT = "oc:run-command";

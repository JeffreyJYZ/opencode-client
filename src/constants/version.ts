/**
 * The About section's copy (spec 010 §Routes, spec 060 M5.3's "app version in
 * Settings"). Every string is named, so the section holds no literal.
 */

export const VERSION_SECTION_LABEL = "About";

/** Where the section sorts: after the built-ins that own their own fields. */
export const VERSION_SECTION_ORDER = 100;

/** The version's own label, and the note naming where the number comes from. */
export const VERSION_LABEL = "Version";
export const VERSION_SOURCE_NOTE =
	"Read from package.json, the same file the app bundle is stamped from.";

export const UPDATE_CHECK_LABEL = "Check for updates";

/**
 * What the check is doing, keyed by the state the check can be in — one key per
 * outcome, so no outcome can fall through to a blank line.
 */
export const UPDATE_STATUS_TEXT = {
	idle: "Updates come from the release manifest.",
	checking: "Checking for updates…",
	current: "This is the newest version.",
	available: "A newer version is available.",
	unsupported: "Updates are checked in the desktop app only.",
	failed: "The update check failed. Nothing was changed.",
} as const;

export type UpdateStatus = keyof typeof UPDATE_STATUS_TEXT;

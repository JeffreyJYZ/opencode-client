/**
 * The About section's copy (spec 010 §Routes, spec 060 M5.3's "app version in
 * Settings"). Every string is named, so the section holds no literal.
 *
 * The self-update flow's own copy lives in `updates.ts`.
 */

export const VERSION_SECTION_LABEL = "About";

/** Where the section sorts: after the built-ins that own their own fields. */
export const VERSION_SECTION_ORDER = 100;

/** The version's own label, and the note naming where the number comes from. */
export const VERSION_LABEL = "Version";
export const VERSION_SOURCE_NOTE =
	"Read from package.json, the same file the app bundle is stamped from.";

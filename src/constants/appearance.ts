/**
 * The Appearance section's copy and ids (M3.5, spec 030 §Theme service). Every
 * string is named so the section holds no literal, and the control writes the
 * theme id through the store — the service is applied by `updateSettings`, never
 * by the component.
 */

export const APPEARANCE_TITLE = "Appearance";

export const APPEARANCE_THEME_LABEL = "Theme";

/** The control's id, so the label is bound to it and a test never guesses one. */
export const APPEARANCE_THEME_FIELD_ID = "appearance-theme";

/**
 * The section's `data-section` marker, mirroring the connect and typography
 * sections': the surface is found by marker rather than by its heading's prose.
 */
export const APPEARANCE_SECTION = "appearance";

/**
 * What the control changes. It says *appearance*, not *colour*, because the
 * registered themes may move anything a theme is allowed to move — a plugin's
 * theme included — while the user's typography stays the typography section's.
 */
export const APPEARANCE_THEME_NOTE =
	"A theme can change colours and sizes; your typography is set in the Typography section and always wins.";

/** The live readout's labels: which theme is in force right now. */
export const APPEARANCE_IN_FORCE_LABEL = "In force";
export const APPEARANCE_UNKNOWN_THEME = "the built-in default";

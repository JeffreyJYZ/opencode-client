import { FONT_ROLE } from "@/constants/settings";

/**
 * The typography section's copy and ids (spec 030 §Two font roles). Every string
 * is named so the section holds no literal, and the ids are keyed by role so a
 * role cannot be handed another role's field.
 */

export const TYPOGRAPHY_TITLE = "Typography";

export const UI_FAMILY_LABEL = "Interface family";
export const UI_SIZE_LABEL = "Interface size";
export const CODE_FAMILY_LABEL = "Code family";
export const CODE_SIZE_LABEL = "Code size";
export const TYPOGRAPHY_RESET_TEXT = "Reset fonts";

/** The label pair per role, so the controls are built from one table. */
export const TYPOGRAPHY_ROLE_LABEL = {
	[FONT_ROLE.ui]: { family: UI_FAMILY_LABEL, size: UI_SIZE_LABEL },
	[FONT_ROLE.code]: { family: CODE_FAMILY_LABEL, size: CODE_SIZE_LABEL },
} as const;

/** Field ids, so a label is bound to its input and a test never guesses a string. */
export const TYPOGRAPHY_FIELD_ID = {
	[FONT_ROLE.ui]: { family: "typography-ui-family", size: "typography-ui-size" },
	[FONT_ROLE.code]: { family: "typography-code-family", size: "typography-code-size" },
} as const;

/** The size control's unit and its readout suffix, named rather than repeated. */
export const PX_UNIT = "px";

/** What each live sample is, so the two samples are told apart on screen. */
export const TYPOGRAPHY_SAMPLE_LABEL = {
	[FONT_ROLE.ui]: "Interface sample",
	[FONT_ROLE.code]: "Code sample",
} as const;

/**
 * The section's `data-section` marker, mirroring the connect section's: the
 * surface is found by marker rather than by its heading's prose.
 */
export const TYPOGRAPHY_SECTION = "typography";

/**
 * The live sample (M3.2 requirement 4): one string rendered in both roles. It
 * carries the glyph vocabulary the code face must draw (`│ ╹ ▀ ↳ ✓`) plus a
 * digit, so a face that cannot draw the rail is visible before it is chosen.
 */
export const TYPOGRAPHY_SAMPLE_TEXT = "Sphinx of black quartz 0123 │ ╹ ▀ ↳ ✓";

/** The theme classes that paint the sample in each role (`base.css`). */
export const TYPOGRAPHY_SAMPLE_CLASS = {
	[FONT_ROLE.ui]: "oc-font-sample",
	[FONT_ROLE.code]: "oc-font-sample-code",
} as const;

/**
 * The stated fallback chain (M3.2 requirement 5). It describes the stacks in
 * `foundations.css`: a family that is missing or misspelt falls through to the
 * next entry, ending at the system stack, so the UI never blanks.
 */
export const TYPOGRAPHY_FALLBACK_NOTE =
	"A missing or misspelt family falls through to the next entry in the role's stack: interface ends at the system UI stack, code at the bundled Geist Mono and then the system mono stack.";

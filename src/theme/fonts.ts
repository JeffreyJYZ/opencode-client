import {
	CODE_FONT_SIZE_MAX,
	CODE_FONT_SIZE_MIN,
	DEFAULT_CODE_FONT_FAMILY,
	DEFAULT_CODE_FONT_SIZE,
	DEFAULT_UI_FONT_FAMILY,
	DEFAULT_UI_FONT_SIZE,
	FONT_ROLE,
	FONT_VARIABLE,
	UI_FONT_SIZE_MAX,
	UI_FONT_SIZE_MIN,
} from "@/constants/settings";

/**
 * The two font roles and how a preference reaches the root (spec 030 §Two font
 * roles, §How a font is applied): `applyFonts()` is the only writer of the four
 * custom properties, and no component holds a family or a size literal.
 *
 * The family *stack* stays in `foundations.css`; this module writes the single
 * family token that stack is built from, so the fallbacks exist in one place.
 */

export type FontRole = (typeof FONT_ROLE)[keyof typeof FONT_ROLE];

export type FontRolePreference = {
	readonly family: string;
	readonly size: number;
};

export type FontPreferences = {
	readonly ui: FontRolePreference;
	readonly code: FontRolePreference;
};

/** Per-role default and bounds, keyed so a role cannot be confused for another. */
const ROLE_DEFAULTS: Readonly<
	Record<FontRole, { family: string; size: number; min: number; max: number }>
> = {
	[FONT_ROLE.ui]: {
		family: DEFAULT_UI_FONT_FAMILY,
		size: DEFAULT_UI_FONT_SIZE,
		min: UI_FONT_SIZE_MIN,
		max: UI_FONT_SIZE_MAX,
	},
	[FONT_ROLE.code]: {
		family: DEFAULT_CODE_FONT_FAMILY,
		size: DEFAULT_CODE_FONT_SIZE,
		min: CODE_FONT_SIZE_MIN,
		max: CODE_FONT_SIZE_MAX,
	},
};

export const DEFAULT_FONTS: FontPreferences = {
	ui: { family: DEFAULT_UI_FONT_FAMILY, size: DEFAULT_UI_FONT_SIZE },
	code: { family: DEFAULT_CODE_FONT_FAMILY, size: DEFAULT_CODE_FONT_SIZE },
};

/** A size inside the role's range; anything else is the role's default. */
export function clampFontSize(role: FontRole, size: number): number {
	const { min, max, size: fallback } = ROLE_DEFAULTS[role];
	if (!Number.isFinite(size)) return fallback;
	return Math.min(max, Math.max(min, Math.round(size)));
}

/**
 * A family as CSS wants it: a single identifier is left bare, anything else is
 * quoted. Quoting a generic (`monospace`) would turn it into a family that never
 * resolves, which is why the bare case is the default and not the exception.
 */
export function cssFamily(family: string): string {
	const bare = /^[A-Za-z][\w-]*$/.test(family);
	return bare ? family : `"${family.replaceAll('"', "")}"`;
}

/** Write the four root properties. Nothing else applies a font (spec 030). */
export function applyFonts(preferences: FontPreferences): void {
	if (typeof document === "undefined") return;
	const style = document.documentElement.style;
	style.setProperty(FONT_VARIABLE.uiFamily, cssFamily(preferences.ui.family));
	style.setProperty(FONT_VARIABLE.uiSize, `${preferences.ui.size}px`);
	style.setProperty(FONT_VARIABLE.codeFamily, cssFamily(preferences.code.family));
	style.setProperty(FONT_VARIABLE.codeSize, `${preferences.code.size}px`);
}

/**
 * The theme service's constants (spec 030 §Theme service, spec 040 §The host):
 * the marker, the one element's id, the mode vocabulary, the built-in pair and
 * the shape a plugin's theme takes. Every literal the service and the registry
 * need lives here, so neither holds one.
 */

/** The root attribute the active theme's mode is written to. One marker. */
export const THEME_ATTRIBUTE = "data-theme";

/** The one `<style>` element the service owns; reused on every apply. */
export const THEME_STYLE_ID = "oc-theme";

/** The two modes a theme declares; the marker's whole vocabulary. */
export const THEME_MODE = { dark: "dark", light: "light" } as const;

export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];

/** The built-in pair: dark first, because dark is the default the CSS declares. */
export const BUILTIN_THEME = {
	dark: { id: "dark", name: "Dark", mode: THEME_MODE.dark },
	light: { id: "light", name: "Light", mode: THEME_MODE.light },
} as const;

/** The ids a plugin may not take, and the id a clear returns to. */
export const BUILTIN_THEME_IDS: readonly string[] = Object.values(BUILTIN_THEME).map(
	(theme) => theme.id,
);
export const DEFAULT_THEME_ID: string = BUILTIN_THEME.dark.id;

/**
 * The query the follow-system preference resolves through (M3.6). Named here so
 * neither the service nor the media edge holds a literal.
 */
export const FOLLOW_SYSTEM_MEDIA_QUERY = "(prefers-color-scheme: dark)";

/**
 * The `settings.theme` value that means "follow the system" (M3.6). It is **not**
 * a theme: nothing registers it, no plugin may take it (the registry reserves
 * it), and the applier reads it before it resolves an id.
 */
export const FOLLOW_SYSTEM_THEME_ID = "system";

/** The primitive layer's prefix: the hue scales a mode is made of. */
export const PRIMITIVE_VARIABLE_PREFIX = "--oc-num-";

/**
 * What a theme may **not** set (spec 030 §Theme service: "A plugin theme cannot
 * override the font variables — user font settings win, so a theme can never
 * make the UI unreadable"). The whole `--oc-font*` family is covered: both
 * families, both sizes, the derived type scale and the app mark.
 */
export const THEME_PROTECTED_VARIABLE_PREFIX = "--oc-font";

/** A `css` block carrying this would close the `<style>` element it is written into. */
export const THEME_CSS_END_TAG = "</style";

/**
 * A theme, in the one shape a built-in and a plugin's contribution share
 * (spec 030 §Theme service): an id, a name, which mode it is, the custom
 * properties it sets, and optionally a block of its own CSS.
 */
export type Theme = {
	readonly id: string;
	readonly name: string;
	readonly mode: ThemeMode;
	readonly variables: Readonly<Record<string, string>>;
	readonly css?: string;
};

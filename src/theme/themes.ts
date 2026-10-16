import type { ThemeMode } from "@/constants/theme";
import { BUILTIN_THEME, PRIMITIVE_VARIABLE_PREFIX, type Theme } from "@/constants/theme";
import document from "@/theme/vendor/opencode.json";

/**
 * The built-in themes, read out of the vendored document rather than re-typed
 * (spec 030 §Tokens: "the palette is not invented … a theme's variables are read
 * out of them").
 *
 * The document defines the semantics once (`base`, with `$…` references) and the
 * hues **per mode** (`dark`, `light`), and each mode's `hue` block carries three
 * aliases — `accent`, `interactive`, `neutral` — so `--oc-accent` is purple in
 * dark and orange in light, and `--oc-focus` is orange in dark and blue in light,
 * from the document's own aliases rather than from a hand-picked value. The
 * darker half of the semantic layer (`--oc-surface`, `--oc-text`, …) is mode-
 * independent because it names a *hue step*: the step's value is what the mode
 * moves.
 *
 * `theme/primitive.css` keeps the dark values as the pre-JS frame — the first
 * paint happens before any module runs — and `themes.test.ts` fails if the two
 * ever disagree, so the duplicate cannot drift silently.
 */

type Scale = Readonly<Record<string, string>>;
type ModeBlock = {
	readonly hue: Readonly<Record<string, Scale | string>>;
	readonly border?: { readonly base: string };
};
type ThemeDocument = {
	readonly base: { readonly border: { readonly base: string } };
	readonly dark: ModeBlock;
	readonly light: ModeBlock;
};

const DOCUMENT = document as unknown as ThemeDocument;

/** The `$hue.<scale>` an alias names, or the alias itself when it is a scale. */
function scaleName(mode: ThemeMode, alias: string): string {
	const value = DOCUMENT[mode].hue[alias];
	const reference = "$hue.";
	return typeof value === "string" && value.startsWith(reference)
		? value.slice(reference.length)
		: alias;
}

/** The semantic layer: a token, the hue it names, and the step of that hue. */
const SEMANTIC_HUES: readonly (readonly [string, string, string])[] = [
	["--oc-surface", "neutral", "800"],
	["--oc-surface-raised", "neutral", "700"],
	["--oc-surface-raised-high", "neutral", "600"],
	["--oc-text", "neutral", "200"],
	["--oc-text-muted", "neutral", "400"],
	["--oc-accent", "accent", "200"],
	["--oc-danger", "red", "200"],
	["--oc-warn", "orange", "200"],
	["--oc-focus", "interactive", "200"],
];

/** The mode's hue scales: every numeric step, nothing else. */
export function hueVariables(mode: ThemeMode): Record<string, string> {
	const variables: Record<string, string> = {};
	for (const [hue, scale] of Object.entries(DOCUMENT[mode].hue)) {
		// `accent`/`interactive`/`neutral` are aliases, not scales.
		if (typeof scale === "string") continue;
		for (const [step, hex] of Object.entries(scale)) {
			variables[`${PRIMITIVE_VARIABLE_PREFIX}${hue}-${step}`] = hex;
		}
	}
	return variables;
}

/** Every custom property one mode defines: the hue scales, then the semantics. */
export function themeVariables(mode: ThemeMode): Record<string, string> {
	const variables = hueVariables(mode);
	for (const [token, alias, step] of SEMANTIC_HUES) {
		variables[token] = `var(${PRIMITIVE_VARIABLE_PREFIX}${scaleName(mode, alias)}-${step})`;
	}
	variables["--oc-border"] = DOCUMENT[mode].border?.base ?? DOCUMENT.base.border.base;
	return variables;
}

/** Dark first: the default a clear returns to is the first entry. */
export const BUILTIN_THEMES: readonly Theme[] = [BUILTIN_THEME.dark, BUILTIN_THEME.light].map(
	({ id, name, mode }) => ({ id, name, mode, variables: themeVariables(mode) }),
);

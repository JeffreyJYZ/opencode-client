import {
	BUNDLED_CODE_FONT_FAMILY,
	DEFAULT_CODE_FONT_FAMILY,
	DEFAULT_UI_FONT_FAMILY,
	FONT_ROLE,
} from "@/constants/settings";
import type { FontRole } from "@/theme/fonts";

/**
 * The faces the picker offers (spec 030 §Face picker, M3.3).
 *
 * **Only names this app can resolve are offered**, and that is a deliberate
 * limit: `document.fonts.check()` returns true for a misspelt family, and a
 * webview has no way to enumerate the machine's fonts (`queryLocalFonts` is
 * Chromium-only and permission-gated, absent in WKWebView), so the honest option
 * set is the families the app's own stacks name — the bundled webfaces, the
 * Nerd Font cuts the cask installs, and the CSS generics. A name outside it is
 * refused rather than stored, because a misspelt family silently falls through
 * to the next entry of the stack and looks like it worked.
 *
 * The three Nerd Font cuts are offered **by the name the webview resolves**,
 * never by file name (`GeistMonoNerdFontMono-*.otf` is `GeistMono Nerd Font
 * Mono`); the cask's short aliases match too, so a user who knows either name
 * finds it. The bundled faces are declared in `theme/base.css` and the machine
 * families are installed by the cask; both are proven by measurement in the
 * M3.3 report, not by a declaration here.
 */

/** The CSS generics (spec 030 §Face picker), named so no caller holds a literal. */
export const CSS_GENERIC_FACE = {
	systemUi: "system-ui",
	uiSansSerif: "ui-sans-serif",
	uiMonospace: "ui-monospace",
	uiRounded: "ui-rounded",
	monospace: "monospace",
} as const;

/** Which of the three ways a face reaches the machine. */
export const FACE_KIND = {
	bundled: "bundled",
	machine: "machine",
	generic: "generic",
} as const;

export type Face = {
	/** What `font-family` gets and what the store holds. */
	readonly family: string;
	/** Other names that resolve to the same face (the cask's short aliases). */
	readonly aliases: readonly string[];
	readonly kind: (typeof FACE_KIND)[keyof typeof FACE_KIND];
};

function bundled(family: string): Face {
	return { family, aliases: [], kind: FACE_KIND.bundled };
}

function generic(family: string): Face {
	return { family, aliases: [], kind: FACE_KIND.generic };
}

/** The three families `font-geist-mono-nerd-font` installs, each with its short alias. */
export const NERD_FONT_FACES: readonly Face[] = [
	{
		family: DEFAULT_CODE_FONT_FAMILY,
		aliases: ["GeistMono NF"],
		kind: FACE_KIND.machine,
	},
	{
		family: "GeistMono Nerd Font Mono",
		aliases: ["GeistMono NFM"],
		kind: FACE_KIND.machine,
	},
	{
		family: "GeistMono Nerd Font Propo",
		aliases: ["GeistMono NFP"],
		kind: FACE_KIND.machine,
	},
];

/** Face order is the order the picker lists them in. */
export const FACES: Readonly<Record<FontRole, readonly Face[]>> = {
	[FONT_ROLE.ui]: [
		bundled(DEFAULT_UI_FONT_FAMILY),
		generic(CSS_GENERIC_FACE.systemUi),
		generic(CSS_GENERIC_FACE.uiSansSerif),
		generic(CSS_GENERIC_FACE.uiRounded),
	],
	[FONT_ROLE.code]: [
		...NERD_FONT_FACES,
		bundled(BUNDLED_CODE_FONT_FAMILY),
		generic(CSS_GENERIC_FACE.uiMonospace),
		generic(CSS_GENERIC_FACE.monospace),
	],
};

/** Every name a role offers, canonical first — what the `<datalist>` lists. */
export function faceNames(role: FontRole): readonly string[] {
	return FACES[role].map((face) => face.family);
}

/** Whether a name is one of the role's aliases; used by the refusal message. */
export function faceByAlias(role: FontRole, value: string): Face | null {
	const wanted = value.trim().toLowerCase();
	for (const face of FACES[role]) {
		for (const alias of face.aliases) if (alias.toLowerCase() === wanted) return face;
	}
	return null;
}

/**
 * The face a name names, or `null` when this app cannot resolve it. Matching is
 * trimmed and case-insensitive (a family name is not case-sensitive in CSS), and
 * an alias resolves to its canonical face — so "geistmono nfm" is not a
 * misspelling, it is `GeistMono Nerd Font Mono`.
 */
export function resolveFace(role: FontRole, value: string): Face | null {
	const wanted = value.trim().toLowerCase();
	if (wanted === "") return null;
	for (const face of FACES[role]) if (face.family.toLowerCase() === wanted) return face;
	return faceByAlias(role, value);
}

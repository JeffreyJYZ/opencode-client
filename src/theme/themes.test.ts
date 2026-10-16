import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	BUILTIN_THEME,
	BUILTIN_THEME_IDS,
	DEFAULT_THEME_ID,
	PRIMITIVE_VARIABLE_PREFIX,
	THEME_MODE,
} from "@/constants/theme";
import { BUILTIN_THEMES, hueVariables, themeVariables } from "@/theme/themes";
import document from "@/theme/vendor/opencode.json";

/**
 * The built-in themes are **data read out of the vendored document** (spec 030
 * §Tokens/§Theme service), so this test is about the derivation, not about values
 * a human typed: it resolves the same document independently and fails if the two
 * disagree. The last block is the drift guard the split creates — `primitive.css`
 * keeps the dark values as the pre-JS frame, and this is what stops the copy
 * rotting.
 */

type Scale = Record<string, string>;
type Doc = {
	readonly base: { readonly border: { readonly base: string } };
	readonly dark: {
		readonly hue: Record<string, Scale | string>;
		readonly border?: { readonly base: string };
	};
	readonly light: {
		readonly hue: Record<string, Scale | string>;
		readonly border?: { readonly base: string };
	};
};

const DOC = document as unknown as Doc;
const dark = BUILTIN_THEMES.find((theme) => theme.id === BUILTIN_THEME.dark.id);
const light = BUILTIN_THEMES.find((theme) => theme.id === BUILTIN_THEME.light.id);

/** The document's own hue scales for a mode, as the service would name them. */
function expectedHues(
	mode: typeof THEME_MODE.dark | typeof THEME_MODE.light,
): Record<string, string> {
	const expected: Record<string, string> = {};
	for (const [hue, steps] of Object.entries(DOC[mode].hue)) {
		// `accent`/`interactive`/`neutral` are aliases (`"$hue.purple"`), not scales.
		if (typeof steps === "string") continue;
		for (const [step, hex] of Object.entries(steps)) {
			expected[`${PRIMITIVE_VARIABLE_PREFIX}${hue}-${step}`] = hex;
		}
	}
	return expected;
}

describe("the built-in pair", () => {
	test("dark and light are both in the registry, dark first, and a clear returns to dark", () => {
		expect(BUILTIN_THEMES.map((theme) => theme.id)).toEqual([...BUILTIN_THEME_IDS]);
		expect(BUILTIN_THEMES[0]?.id).toBe(DEFAULT_THEME_ID);
		expect(dark?.mode).toBe(THEME_MODE.dark);
		expect(light?.mode).toBe(THEME_MODE.light);
	});

	test("both carry the shape a plugin theme does: id, name, mode, variables", () => {
		for (const theme of BUILTIN_THEMES) {
			expect(theme.name.length).toBeGreaterThan(0);
			expect(Object.keys(theme.variables).length).toBeGreaterThan(0);
			for (const [token, value] of Object.entries(theme.variables)) {
				expect(token.startsWith("--oc-")).toBe(true);
				expect(typeof value).toBe("string");
			}
		}
	});

	test("no theme claims a font variable: the user's typography is not a theme's business", () => {
		for (const theme of BUILTIN_THEMES) {
			const fonts = Object.keys(theme.variables).filter((token) =>
				token.startsWith("--oc-font"),
			);
			expect(fonts).toEqual([]);
		}
	});
});

describe("the variables come from the vendored document", () => {
	test("every mode's hue scale is the document's own scale, step for step", () => {
		for (const mode of [THEME_MODE.dark, THEME_MODE.light]) {
			expect(hueVariables(mode)).toEqual(expectedHues(mode));
		}
	});

	test("the light mode is not the dark one: the scales really differ", () => {
		expect(hueVariables(THEME_MODE.dark)[`${PRIMITIVE_VARIABLE_PREFIX}gray-800`]).toBe(
			"#0a0a0a",
		);
		expect(hueVariables(THEME_MODE.light)[`${PRIMITIVE_VARIABLE_PREFIX}gray-800`]).toBe(
			"#ffffff",
		);
	});

	test("the border is the document's mode border, falling back to the base", () => {
		expect(dark?.variables["--oc-border"]).toBe(DOC.base.border.base);
		expect(light?.variables["--oc-border"]).toBe(DOC.light.border?.base);
		expect(light?.variables["--oc-border"]).not.toBe(dark?.variables["--oc-border"]);
	});

	test("the mode aliases are followed, not hard-coded: accent and focus move with the mode", () => {
		expect(dark?.variables["--oc-accent"]).toBe("var(--oc-num-purple-200)");
		expect(light?.variables["--oc-accent"]).toBe("var(--oc-num-orange-200)");
		expect(dark?.variables["--oc-focus"]).toBe("var(--oc-num-orange-200)");
		expect(light?.variables["--oc-focus"]).toBe("var(--oc-num-blue-200)");
	});

	test("the semantic half names a hue step, so a mode moves a value and not the mapping", () => {
		for (const mode of [THEME_MODE.dark, THEME_MODE.light]) {
			const variables = themeVariables(mode);
			expect(variables["--oc-surface"]).toBe("var(--oc-num-gray-800)");
			expect(variables["--oc-text"]).toBe("var(--oc-num-gray-200)");
			expect(variables["--oc-text-muted"]).toBe("var(--oc-num-gray-400)");
			expect(variables["--oc-surface-raised"]).toBe("var(--oc-num-gray-700)");
			expect(variables["--oc-surface-raised-high"]).toBe("var(--oc-num-gray-600)");
		}
	});
});

describe("primitive.css agrees with the dark theme", () => {
	const css = readFileSync(join(process.cwd(), "src", "theme", "primitive.css"), "utf8");

	test("every hue the file declares is the dark theme's value, and no more", () => {
		const declared = new Map<string, string>();
		for (const [, token, value] of css.matchAll(/(--oc-num-[\w-]+):\s*(#[\w]+);/g)) {
			declared.set(token as string, value as string);
		}
		expect(declared.size).toBe(Object.keys(hueVariables(THEME_MODE.dark)).length);
		for (const [token, value] of declared) {
			expect(hueVariables(THEME_MODE.dark)[token]).toBe(value);
		}
	});

	test("the file carries no per-mode branch: the light mode is theme data, not a selector", () => {
		expect(css).not.toContain("data-theme");
	});
});

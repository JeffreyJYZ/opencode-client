import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
import { applyFonts, clampFontSize, cssFamily, DEFAULT_FONTS } from "@/theme/fonts";

afterEach(() => {
	document.documentElement.removeAttribute("style");
});

describe("cssFamily", () => {
	test("a single identifier is left bare", () => {
		expect(cssFamily("Geist")).toBe("Geist");
		expect(cssFamily("monospace")).toBe("monospace");
		expect(cssFamily("ui-monospace")).toBe("ui-monospace");
	});

	test("a generic is never quoted — quoting one makes it a family that never resolves", () => {
		expect(cssFamily("system-ui")).toBe("system-ui");
	});

	test("anything else is quoted, so a space or a comma cannot split the list", () => {
		expect(cssFamily("GeistMono Nerd Font")).toBe('"GeistMono Nerd Font"');
		expect(cssFamily("Comic Sans, MS")).toBe('"Comic Sans, MS"');
	});
});

describe("clampFontSize", () => {
	test("bounds each role by its own range", () => {
		expect(clampFontSize(FONT_ROLE.ui, UI_FONT_SIZE_MIN - 1)).toBe(UI_FONT_SIZE_MIN);
		expect(clampFontSize(FONT_ROLE.ui, UI_FONT_SIZE_MAX + 1)).toBe(UI_FONT_SIZE_MAX);
		expect(clampFontSize(FONT_ROLE.code, CODE_FONT_SIZE_MIN - 1)).toBe(CODE_FONT_SIZE_MIN);
		expect(clampFontSize(FONT_ROLE.code, CODE_FONT_SIZE_MAX + 1)).toBe(CODE_FONT_SIZE_MAX);
	});

	test("a fractional size rounds, a non-number is the role's default", () => {
		expect(clampFontSize(FONT_ROLE.ui, 15.4)).toBe(15);
		expect(clampFontSize(FONT_ROLE.ui, Number.NaN)).toBe(DEFAULT_UI_FONT_SIZE);
		expect(clampFontSize(FONT_ROLE.code, Number.POSITIVE_INFINITY)).toBe(
			DEFAULT_CODE_FONT_SIZE,
		);
	});
});

describe("applyFonts", () => {
	test("writes the four root properties from the preference", () => {
		applyFonts({
			ui: { family: "Inter", size: 18 },
			code: { family: "GeistMono Nerd Font", size: 12 },
		});
		const style = document.documentElement.style;
		expect(style.getPropertyValue(FONT_VARIABLE.uiFamily)).toBe("Inter");
		expect(style.getPropertyValue(FONT_VARIABLE.uiSize)).toBe("18px");
		expect(style.getPropertyValue(FONT_VARIABLE.codeFamily)).toBe('"GeistMono Nerd Font"');
		expect(style.getPropertyValue(FONT_VARIABLE.codeSize)).toBe("12px");
	});

	test("applying the defaults writes the tokens the stylesheet declares", () => {
		applyFonts(DEFAULT_FONTS);
		const style = document.documentElement.style;
		expect(style.getPropertyValue(FONT_VARIABLE.uiFamily)).toBe(DEFAULT_UI_FONT_FAMILY);
		expect(style.getPropertyValue(FONT_VARIABLE.codeFamily)).toBe(
			`"${DEFAULT_CODE_FONT_FAMILY}"`,
		);
	});
});

describe("foundations.css agrees with the font constants", () => {
	const css = readFileSync(join(process.cwd(), "src", "theme", "foundations.css"), "utf8");

	test("the family tokens are the defaults, composed into the stacks", () => {
		expect(css).toContain(`${FONT_VARIABLE.uiFamily}: ${DEFAULT_UI_FONT_FAMILY}`);
		expect(css).toContain(`${FONT_VARIABLE.codeFamily}: "${DEFAULT_CODE_FONT_FAMILY}"`);
		expect(css).toContain(`${FONT_VARIABLE.uiSize}: ${DEFAULT_UI_FONT_SIZE}px`);
		expect(css).toContain(`${FONT_VARIABLE.codeSize}: ${DEFAULT_CODE_FONT_SIZE}px`);
		expect(css).toContain("--oc-font-ui: var(--oc-font-ui-family)");
		// Biome wraps a long declaration onto its own line, so match across whitespace.
		expect(css.replace(/\s+/g, " ")).toContain(
			'--oc-font-code: var(--oc-font-code-family), "Geist Mono"',
		);
	});
});

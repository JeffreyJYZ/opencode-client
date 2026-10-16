import { describe, expect, test } from "bun:test";
import {
	BUNDLED_CODE_FONT_FAMILY,
	DEFAULT_CODE_FONT_FAMILY,
	DEFAULT_UI_FONT_FAMILY,
	FONT_ROLE,
} from "@/constants/settings";
import { CSS_GENERIC_FACE, FACES, faceNames, resolveFace } from "@/theme/faces";

/**
 * The M3.3 contract in unit form: the picker offers exactly the names this app
 * can resolve, matches the cask's aliases to their canonical face, and resolves
 * a misspelt one to **nothing** — which is what makes the picker able to refuse
 * it. The measurement that a *good* name really resolves belongs to the report,
 * not to the app (spec 030 §How a font is applied).
 */

describe("the offered faces", () => {
	test("each role offers its own faces, canonical names only", () => {
		expect(faceNames(FONT_ROLE.ui)).toEqual([
			DEFAULT_UI_FONT_FAMILY,
			CSS_GENERIC_FACE.systemUi,
			CSS_GENERIC_FACE.uiSansSerif,
			CSS_GENERIC_FACE.uiRounded,
		]);
		expect(faceNames(FONT_ROLE.code)).toEqual([
			DEFAULT_CODE_FONT_FAMILY,
			"GeistMono Nerd Font Mono",
			"GeistMono Nerd Font Propo",
			BUNDLED_CODE_FONT_FAMILY,
			CSS_GENERIC_FACE.uiMonospace,
			CSS_GENERIC_FACE.monospace,
		]);
	});

	test("a face is never offered by a file name, and no option is a duplicate", () => {
		for (const role of [FONT_ROLE.ui, FONT_ROLE.code]) {
			const names = faceNames(role);
			expect(new Set(names).size).toBe(names.length);
			for (const name of names) expect(name).not.toContain(".otf");
		}
	});

	test("the role's default is offered by the role", () => {
		expect(resolveFace(FONT_ROLE.ui, DEFAULT_UI_FONT_FAMILY)?.family).toBe(
			DEFAULT_UI_FONT_FAMILY,
		);
		expect(resolveFace(FONT_ROLE.code, DEFAULT_CODE_FONT_FAMILY)?.family).toBe(
			DEFAULT_CODE_FONT_FAMILY,
		);
	});

	test("every offered family is in the array its kind implies", () => {
		expect(FACES[FONT_ROLE.code].some((face) => face.family === BUNDLED_CODE_FONT_FAMILY)).toBe(
			true,
		);
		expect(FACES[FONT_ROLE.ui].every((face) => face.aliases.length === 0)).toBe(true);
	});
});

describe("resolveFace", () => {
	test("a misspelt family resolves to nothing", () => {
		for (const misspelt of [
			"Geistt",
			"GeistMono Nerd Fnot",
			"No Such Face",
			"monospacee",
			"OpenCode Mark",
		]) {
			expect(resolveFace(FONT_ROLE.code, misspelt)).toBeNull();
			expect(resolveFace(FONT_ROLE.ui, misspelt)).toBeNull();
		}
	});

	test("the cask's short alias resolves to the canonical face", () => {
		expect(resolveFace(FONT_ROLE.code, "GeistMono NF")?.family).toBe(DEFAULT_CODE_FONT_FAMILY);
		expect(resolveFace(FONT_ROLE.code, "GeistMono NFM")?.family).toBe(
			"GeistMono Nerd Font Mono",
		);
		expect(resolveFace(FONT_ROLE.code, "GeistMono NFP")?.family).toBe(
			"GeistMono Nerd Font Propo",
		);
	});

	test("case and surrounding space do not matter; empty is nothing", () => {
		expect(resolveFace(FONT_ROLE.ui, "  geist  ")?.family).toBe(DEFAULT_UI_FONT_FAMILY);
		expect(resolveFace(FONT_ROLE.ui, "GEIST")?.family).toBe(DEFAULT_UI_FONT_FAMILY);
		expect(resolveFace(FONT_ROLE.code, "geistmono nerd font")?.family).toBe(
			DEFAULT_CODE_FONT_FAMILY,
		);
		expect(resolveFace(FONT_ROLE.ui, "   ")).toBeNull();
	});

	test("a face offered for one role is not offered for the other", () => {
		expect(resolveFace(FONT_ROLE.ui, "monospace")).toBeNull();
		expect(resolveFace(FONT_ROLE.code, DEFAULT_UI_FONT_FAMILY)).toBeNull();
	});
});

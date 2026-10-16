import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { BUILTIN_THEME, THEME_MODE, THEME_STYLE_ID, type Theme } from "@/constants/theme";
import { REFUSED } from "@/plugins/disposable";
import { clearFaults } from "@/plugins/faults";
import { marker, PROOF_THEME, styleCount, styles, themeFaults } from "@/test/theme";
import {
	activeTheme,
	applyTheme,
	clearTheme,
	listThemes,
	registerTheme,
	resetThemeService,
} from "@/theme/service";
import { BUILTIN_THEMES } from "@/theme/themes";

/**
 * The theme service's ordinary path (M3.4, spec 030 §Theme service). Every DOM
 * assertion reads the **attribute** and the one `<style>` element's text — what
 * the service actually writes — because happy-dom has no cascade: the
 * computed-style half of this proof is the browser run quoted in the report.
 */

const handles: Array<{ dispose: () => void }> = [];

function register(theme: Theme = PROOF_THEME) {
	const handle = registerTheme(theme);
	handles.push(handle);
	return handle;
}

beforeEach(() => {
	clearFaults();
	resetThemeService();
});

afterEach(() => {
	for (const handle of handles.splice(0)) handle.dispose();
	resetThemeService();
	clearFaults();
});

describe("applying a theme", () => {
	test("writes the marker and the variables into exactly one style element", () => {
		expect(applyTheme(BUILTIN_THEME.light.id)).toBe(true);
		expect(marker()).toBe(THEME_MODE.light);
		expect(document.querySelectorAll(`#${THEME_STYLE_ID}`)).toHaveLength(1);
		expect(styleCount()).toBe(1);
		expect(styles()).toContain("--oc-border: #b8b8b8;");
		expect(styles()).toContain("--oc-num-gray-800: #ffffff;");
		expect(activeTheme()?.id).toBe(BUILTIN_THEME.light.id);
	});

	test("is idempotent: applying again reuses the same element", () => {
		applyTheme(BUILTIN_THEME.light.id);
		const element = document.getElementById(THEME_STYLE_ID);
		applyTheme(BUILTIN_THEME.light.id);
		expect(document.getElementById(THEME_STYLE_ID)).toBe(element);
		expect(styleCount()).toBe(1);
	});

	test("a switch leaves nothing of the previous theme behind", () => {
		register();
		applyTheme(PROOF_THEME.id);
		expect(styles()).toContain("--oc-surface: #123456;");
		expect(styles()).toContain("outline: 1px solid magenta");
		expect(marker()).toBe(THEME_MODE.light);

		applyTheme(BUILTIN_THEME.dark.id);
		expect(styles()).not.toContain("#123456");
		expect(styles()).not.toContain("magenta");
		expect(marker()).toBe(THEME_MODE.dark);
		expect(document.querySelectorAll(`#${THEME_STYLE_ID}`)).toHaveLength(1);
	});

	test("clearing returns to the built-in default, with the dark scale in force", () => {
		register();
		applyTheme(PROOF_THEME.id);
		expect(clearTheme()).toBe(true);
		expect(activeTheme()?.id).toBe(BUILTIN_THEME.dark.id);
		expect(marker()).toBe(THEME_MODE.dark);
		expect(styles()).not.toContain("#123456");
		for (const [token, value] of Object.entries(BUILTIN_THEMES[0]?.variables ?? {})) {
			expect(styles()).toContain(`${token}: ${value};`);
		}
	});

	test("a theme's own css rides in the same one element, after the variables", () => {
		register();
		applyTheme(PROOF_THEME.id);
		const text = styles();
		expect(text.indexOf(":root {")).toBeLessThan(text.indexOf("outline: 1px solid magenta"));
		expect(styleCount()).toBe(1);
	});
});

describe("the registry behind the service", () => {
	test("lists the built-in pair, and a plugin's theme joins them", () => {
		register();
		expect(listThemes().map((theme) => theme.id)).toEqual([
			BUILTIN_THEME.dark.id,
			BUILTIN_THEME.light.id,
			PROOF_THEME.id,
		]);
	});

	test("disposing the theme in force clears back to the built-in default", () => {
		const handle = register();
		applyTheme(PROOF_THEME.id);
		handle.dispose();
		expect(listThemes().some((theme) => theme.id === PROOF_THEME.id)).toBe(false);
		expect(activeTheme()?.id).toBe(BUILTIN_THEME.dark.id);
		expect(styles()).not.toContain("#123456");
		expect(themeFaults()).toHaveLength(0);
	});

	test("a refused registration is the same inert handle a slot gets", () => {
		expect(registerTheme({ ...PROOF_THEME, id: BUILTIN_THEME.dark.id })).toBe(REFUSED);
	});
});

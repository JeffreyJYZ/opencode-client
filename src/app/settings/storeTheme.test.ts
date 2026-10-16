import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getSettings, restoreSettings, updateSettings } from "@/app/settings/store";
import { FONT_VARIABLE, SETTING_KEYS, SETTINGS_STORAGE_KEY } from "@/constants/settings";
import {
	BUILTIN_THEME,
	THEME_ATTRIBUTE,
	THEME_MODE,
	THEME_STYLE_ID,
	type Theme,
} from "@/constants/theme";
import { clearFaults } from "@/plugins/faults";
import { fakeStorage, resetSettingsState } from "@/test/settings";
import { DEFAULT_FONTS } from "@/theme/fonts";
import { applyTheme, registerTheme, resetThemeService } from "@/theme/service";

/**
 * M3.4's store contract, in unit form: the stored theme id is applied on boot and
 * live on change, and the precedence between a theme and the user's typography
 * holds in **both** directions. The browser proof repeats this against real
 * computed styles; this pins the write path and the blob text a restart reads.
 */

const PLUGIN: Theme = {
	id: "m34-store-theme",
	name: "M3.4 store proof",
	mode: THEME_MODE.light,
	variables: { "--oc-surface": "#123456", "--oc-font-ui": "Times New Roman, serif" },
};

const CHOSEN_FONTS = { ...DEFAULT_FONTS, ui: { family: "ui-rounded", size: 17 } };

function marker(): string | null {
	return document.documentElement.getAttribute(THEME_ATTRIBUTE);
}

function styleText(): string {
	return document.getElementById(THEME_STYLE_ID)?.textContent ?? "";
}

const root = (variable: string): string =>
	document.documentElement.style.getPropertyValue(variable);

let storage: ReturnType<typeof fakeStorage>;
let plugin: { dispose: () => void } | null = null;

beforeEach(() => {
	resetSettingsState();
	resetThemeService();
	clearFaults();
	storage = fakeStorage();
});

afterEach(() => {
	plugin?.dispose();
	plugin = null;
	resetThemeService();
	resetSettingsState();
	clearFaults();
	document.documentElement.removeAttribute("style");
});

describe("the stored theme in the settings blob", () => {
	test("a boot with nothing stored puts the built-in default in force", () => {
		restoreSettings(storage);
		expect(marker()).toBe(THEME_MODE.dark);
		expect(getSettings().theme).toBeNull();
		expect(styleText()).toContain("--oc-num-gray-800: #0a0a0a;");
	});

	test("a change is applied live and persisted under settings.theme", () => {
		restoreSettings(storage);
		updateSettings({ theme: BUILTIN_THEME.light.id });
		expect(marker()).toBe(THEME_MODE.light);
		expect(styleText()).toContain("--oc-num-gray-800: #ffffff;");
		const written = storage.entries()[SETTINGS_STORAGE_KEY];
		if (written === undefined) throw new Error("nothing was written");
		expect((JSON.parse(written) as Record<string, unknown>)[SETTING_KEYS.theme]).toBe(
			BUILTIN_THEME.light.id,
		);
	});

	test("a restart re-applies it from the blob alone", () => {
		restoreSettings(storage);
		updateSettings({ theme: BUILTIN_THEME.light.id });
		const persisted = storage.entries()[SETTINGS_STORAGE_KEY];
		if (persisted === undefined) throw new Error("nothing was written");

		resetSettingsState();
		resetThemeService();
		document.documentElement.removeAttribute("style");
		expect(marker()).toBeNull();

		restoreSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: persisted }));
		expect(getSettings().theme).toBe(BUILTIN_THEME.light.id);
		expect(marker()).toBe(THEME_MODE.light);
	});

	test("a stored plugin theme whose plugin has not loaded boots on the built-in, id intact", () => {
		restoreSettings(
			fakeStorage({
				[SETTINGS_STORAGE_KEY]: JSON.stringify({
					[SETTING_KEYS.dataVersion]: 4,
					[SETTING_KEYS.theme]: PLUGIN.id,
				}),
			}),
		);
		expect(marker()).toBe(THEME_MODE.dark);
		expect(getSettings().theme).toBe(PLUGIN.id);

		// The plugin's own load registers **and** applies it (spec 040 `themes.register`
		// + `apply`) — the store does not chase the registry, and the id it could not
		// resolve at boot is still there for that call to use.
		plugin = registerTheme(PLUGIN);
		expect(applyTheme(PLUGIN.id)).toBe(true);
		expect(marker()).toBe(THEME_MODE.light);
		expect(styleText()).toContain("--oc-surface: #123456;");
		expect(getSettings().theme).toBe(PLUGIN.id);
	});
});

describe("typography always outranks a theme", () => {
	test("a font change does not disturb the theme in force", () => {
		plugin = registerTheme(PLUGIN);
		restoreSettings(storage);
		updateSettings({ theme: PLUGIN.id });
		expect(marker()).toBe(THEME_MODE.light);
		expect(styleText()).not.toContain("Times New Roman");

		updateSettings({ fonts: CHOSEN_FONTS });
		expect(marker()).toBe(THEME_MODE.light);
		expect(styleText()).toContain("--oc-surface: #123456;");
		expect(root(FONT_VARIABLE.uiFamily)).toBe("ui-rounded");
	});

	test("a theme claiming a font variable cannot move a font chosen first", () => {
		plugin = registerTheme(PLUGIN);
		restoreSettings(storage);
		updateSettings({ fonts: CHOSEN_FONTS });
		applyTheme(PLUGIN.id);
		expect(root(FONT_VARIABLE.uiFamily)).toBe("ui-rounded");
		expect(root(FONT_VARIABLE.uiSize)).toBe("17px");
		expect(styleText()).not.toContain("--oc-font");
	});
});

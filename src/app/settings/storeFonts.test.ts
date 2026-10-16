import { afterEach, describe, expect, test } from "bun:test";
import { getSettings, restoreSettings, updateSettings } from "@/app/settings/store";
import { FONT_VARIABLE, SETTING_KEYS, SETTINGS_STORAGE_KEY } from "@/constants/settings";
import { fakeStorage, resetSettingsState } from "@/test/settings";
import type { FontPreferences } from "@/theme/fonts";
import { DEFAULT_FONTS } from "@/theme/fonts";

/**
 * The M3.2 persistence contract, in unit form: a font change is on the root the
 * moment it is made, is the only thing written under `settings.fonts`, and comes
 * back on the next boot from nothing but the blob text. The browser proof repeats
 * this against a real reload; this one pins the field path.
 */

const CHOSEN: FontPreferences = {
	ui: { family: "Inter", size: 18 },
	code: { family: "GeistMono Nerd Font", size: 12 },
};

const root = (variable: string): string =>
	document.documentElement.style.getPropertyValue(variable);

afterEach(() => {
	resetSettingsState();
	document.documentElement.removeAttribute("style");
});

describe("font preferences in the settings blob", () => {
	test("a change is applied live and persisted under settings.fonts", () => {
		resetSettingsState();
		const storage = fakeStorage();
		restoreSettings(storage);
		updateSettings({ fonts: CHOSEN });
		expect(root(FONT_VARIABLE.uiFamily)).toBe(CHOSEN.ui.family);
		expect(root(FONT_VARIABLE.uiSize)).toBe(`${CHOSEN.ui.size}px`);
		expect(root(FONT_VARIABLE.codeFamily)).toBe(`"${CHOSEN.code.family}"`);
		expect(root(FONT_VARIABLE.codeSize)).toBe(`${CHOSEN.code.size}px`);
		const written = storage.entries()[SETTINGS_STORAGE_KEY];
		if (written === undefined) throw new Error("nothing was written");
		expect((JSON.parse(written) as Record<string, unknown>)[SETTING_KEYS.fonts]).toEqual(
			CHOSEN,
		);
	});

	test("a restart re-applies them from the blob alone", () => {
		resetSettingsState();
		const first = fakeStorage();
		restoreSettings(first);
		updateSettings({ fonts: CHOSEN });
		const persisted = first.entries()[SETTINGS_STORAGE_KEY];
		if (persisted === undefined) throw new Error("nothing was written");

		// A restart: the in-memory state and the root's inline style both go, and
		// the next boot sees only the disk text.
		resetSettingsState();
		document.documentElement.removeAttribute("style");
		expect(root(FONT_VARIABLE.uiFamily)).toBe("");

		restoreSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: persisted }));
		expect(getSettings().fonts).toEqual(CHOSEN);
		expect(root(FONT_VARIABLE.uiFamily)).toBe(CHOSEN.ui.family);
		expect(root(FONT_VARIABLE.codeSize)).toBe(`${CHOSEN.code.size}px`);
	});

	test("a blob written before fonts existed still boots on the defaults", () => {
		resetSettingsState();
		// The captured version-1 blob has fonts, so drop the field: the reader's
		// normalization is what covers a blob with no fonts at all.
		restoreSettings(
			fakeStorage({
				[SETTINGS_STORAGE_KEY]: JSON.stringify({ [SETTING_KEYS.dataVersion]: 3 }),
			}),
		);
		expect(getSettings().fonts).toEqual(DEFAULT_FONTS);
	});
});

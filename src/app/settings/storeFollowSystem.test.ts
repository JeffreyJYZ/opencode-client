import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { getSettings, restoreSettings, updateSettings } from "@/app/settings/store";
import { SETTING_KEYS, SETTINGS_STORAGE_KEY } from "@/constants/settings";
import {
	BUILTIN_THEME,
	FOLLOW_SYSTEM_MEDIA_QUERY,
	FOLLOW_SYSTEM_THEME_ID,
	THEME_MODE,
} from "@/constants/theme";
import { clearFaults } from "@/plugins/faults";
import { blobDocument, fakeStorage, resetSettingsState } from "@/test/settings";
import { marker, stubMedia } from "@/test/theme";
import { resetThemeService } from "@/theme/service";

/**
 * The follow-system **stored choice** (M3.6): the sentinel round-trips through the
 * blob, a boot applies the mode the system asks for at that moment, and the media
 * watch is attached on that boot path and nowhere else. The real OS flip is the
 * user's hand check — here the system is a stub.
 */

const restorers: Array<() => void> = [];

beforeEach(() => {
	resetSettingsState();
	resetThemeService();
	clearFaults();
});

afterEach(() => {
	for (const restore of restorers.splice(0)) restore();
	resetThemeService();
	resetSettingsState();
	clearFaults();
});

describe("the follow-system sentinel in the settings blob", () => {
	test("choosing it stores the sentinel, applies the system's mode, and follows a flip", () => {
		const media = stubMedia(false);
		restorers.push(media.restore);
		const storage = fakeStorage();
		restoreSettings(storage);

		updateSettings({ theme: FOLLOW_SYSTEM_THEME_ID });
		expect(marker()).toBe(THEME_MODE.light);
		expect(media.record.query).toBe(FOLLOW_SYSTEM_MEDIA_QUERY);

		media.flip(true);
		expect(marker()).toBe(THEME_MODE.dark);

		const written = storage.entries()[SETTINGS_STORAGE_KEY];
		if (written === undefined) throw new Error("nothing was written");
		expect((JSON.parse(written) as Record<string, unknown>)[SETTING_KEYS.theme]).toBe(
			FOLLOW_SYSTEM_THEME_ID,
		);
	});

	test("a restart re-applies it from the blob alone, resolving the system then", () => {
		const media = stubMedia(false);
		restorers.push(media.restore);
		const storage = fakeStorage();
		restoreSettings(storage);
		updateSettings({ theme: FOLLOW_SYSTEM_THEME_ID });
		const persisted = storage.entries()[SETTINGS_STORAGE_KEY];
		if (persisted === undefined) throw new Error("nothing was written");

		resetSettingsState();
		resetThemeService();
		expect(marker()).toBeNull();

		const reboot = stubMedia(true);
		restorers.push(reboot.restore);
		restoreSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: persisted }));
		expect(getSettings().theme).toBe(FOLLOW_SYSTEM_THEME_ID);
		expect(marker()).toBe(THEME_MODE.dark);
		expect(reboot.count()).toBe(1);
	});

	test("a stored named theme attaches no watch on boot", () => {
		const media = stubMedia(true);
		restorers.push(media.restore);
		restoreSettings(fakeStorage());
		updateSettings({ theme: BUILTIN_THEME.light.id });

		resetSettingsState();
		resetThemeService();
		restoreSettings(
			fakeStorage({
				[SETTINGS_STORAGE_KEY]: blobDocument({
					[SETTING_KEYS.theme]: BUILTIN_THEME.light.id,
				}),
			}),
		);
		expect(marker()).toBe(THEME_MODE.light);
		expect(media.record.added).toBe(0);
		expect(media.count()).toBe(0);
	});
});

import { afterEach, describe, expect, test } from "bun:test";
import { getLastOpenedSessionId } from "@/app/lastOpened";
import { getSettings, getSettingsSnapshot, restoreSettings } from "@/app/settings/store";
import { settingsTab } from "@/app/tabModel";
import { getTabSnapshot } from "@/app/tabs";
import { ROUTE_PATH } from "@/constants/routes";
import { SETTING_KEYS, SETTINGS_STORAGE_KEY } from "@/constants/settings";
import {
	blobDocument,
	fakeStorage,
	openTabIds,
	resetSettingsState,
	V0_DOCUMENT_JSON,
} from "@/test/settings";

const A = "ses_settings_a";
const B = "ses_settings_b";

afterEach(() => {
	resetSettingsState();
	document.documentElement.removeAttribute("style");
});

describe("restoreSettings — what the first paint already has", () => {
	test("a fresh install boots on the defaults, with nothing written", () => {
		resetSettingsState();
		const storage = fakeStorage();
		restoreSettings(storage);
		expect(getSettingsSnapshot().notice).toBeNull();
		expect(getTabSnapshot().tabs).toEqual([]);
		expect(window.location.pathname).toBe(ROUTE_PATH.home);
		expect(storage.entries()).toEqual({});
	});

	test("the strip, the active tab and the settings tab come back in one pass", () => {
		resetSettingsState();
		restoreSettings(
			fakeStorage({
				[SETTINGS_STORAGE_KEY]: blobDocument({
					[SETTING_KEYS.tabs]: {
						tabs: [
							{ kind: "session", id: A },
							{ kind: "settings" },
							{ kind: "session", id: B },
						],
						activeIndex: 2,
					},
					[SETTING_KEYS.lastRoute]: `/session/${B}`,
				}),
			}),
		);
		expect(openTabIds()).toEqual([A, "settings", B]);
		expect(getTabSnapshot().activeIndex).toBe(2);
		expect(window.location.pathname).toBe(`/session/${B}`);
	});

	test("the settings tab restores and lands on /settings", () => {
		resetSettingsState();
		restoreSettings(
			fakeStorage({
				[SETTINGS_STORAGE_KEY]: blobDocument({
					[SETTING_KEYS.tabs]: { tabs: [{ kind: "settings" }], activeIndex: 0 },
					[SETTING_KEYS.lastRoute]: ROUTE_PATH.settings,
				}),
			}),
		);
		expect(getTabSnapshot().tabs).toEqual([settingsTab()]);
		expect(window.location.pathname).toBe(ROUTE_PATH.settings);
	});

	test("a stored font preference is on the root before anything renders", () => {
		resetSettingsState();
		restoreSettings(
			fakeStorage({
				[SETTINGS_STORAGE_KEY]: blobDocument({
					[SETTING_KEYS.fonts]: {
						ui: { family: "Inter", size: 17 },
						code: { family: "GeistMono Nerd Font", size: 12 },
					},
				}),
			}),
		);
		const style = document.documentElement.style;
		expect(style.getPropertyValue("--oc-font-ui-family")).toBe("Inter");
		expect(style.getPropertyValue("--oc-font-ui-size")).toBe("17px");
		expect(style.getPropertyValue("--oc-font-code-family")).toBe('"GeistMono Nerd Font"');
		expect(style.getPropertyValue("--oc-font-code-size")).toBe("12px");
	});

	test("recent directories and the continue card come back", () => {
		resetSettingsState();
		restoreSettings(
			fakeStorage({
				[SETTINGS_STORAGE_KEY]: blobDocument({
					[SETTING_KEYS.recentDirectories]: ["/one", "/two"],
					[SETTING_KEYS.lastOpened]: A,
				}),
			}),
		);
		expect(getSettings().recentDirectories).toEqual(["/one", "/two"]);
		expect(getLastOpenedSessionId()).toBe(A);
	});

	test("the version-0 layout restores through the migration", () => {
		resetSettingsState();
		restoreSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: V0_DOCUMENT_JSON }));
		expect(openTabIds()).toEqual(["ses_legacy_a", "settings", "ses_legacy_b"]);
		expect(getTabSnapshot().activeIndex).toBe(1);
		expect(window.location.pathname).toBe("/session/ses_legacy_a");
	});

	test("the restore is idempotent: a second call cannot double-apply", () => {
		resetSettingsState();
		restoreSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: V0_DOCUMENT_JSON }));
		restoreSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: blobDocument() }));
		expect(openTabIds()).toEqual(["ses_legacy_a", "settings", "ses_legacy_b"]);
	});

	test("no storage at all is not an error", () => {
		resetSettingsState();
		restoreSettings(null);
		expect(getSettingsSnapshot().notice).toBeNull();
		expect(getTabSnapshot().tabs).toEqual([]);
	});
});

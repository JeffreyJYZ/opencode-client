import { afterEach, describe, expect, test } from "bun:test";
import {
	getSettings,
	getSettingsSnapshot,
	restoreSettings,
	updateSettings,
} from "@/app/settings/store";
import { sessionTab } from "@/app/tabModel";
import { openTab } from "@/app/tabs";
import { ROUTE_PATH } from "@/constants/routes";
import { SETTING_KEYS, SETTINGS_STORAGE_KEY } from "@/constants/settings";
import {
	blobDocument,
	CORRUPT_DOCUMENT_JSON,
	fakeStorage,
	openTabIds,
	resetSettingsState,
	TOO_NEW_DOCUMENT_JSON,
} from "@/test/settings";

const A = "ses_settings_a";

/** The blob text the app just wrote, parsed. */
function stored(storage: ReturnType<typeof fakeStorage>): Record<string, unknown> {
	const raw = storage.entries()[SETTINGS_STORAGE_KEY];
	if (raw === undefined) throw new Error("nothing was written");
	return JSON.parse(raw) as Record<string, unknown>;
}

afterEach(() => {
	resetSettingsState();
});

describe("one writer", () => {
	test("opening a tab persists the strip through the settings store", () => {
		resetSettingsState();
		const storage = fakeStorage();
		restoreSettings(storage);
		openTab(sessionTab(A));
		expect(stored(storage)[SETTING_KEYS.tabs]).toEqual({
			tabs: [{ kind: "session", id: A }],
			activeIndex: 0,
		});
	});

	test("navigating persists the route", () => {
		resetSettingsState();
		const storage = fakeStorage();
		restoreSettings(storage);
		window.history.pushState(null, "", `/session/${A}`);
		window.dispatchEvent(new PopStateEvent("popstate"));
		expect(stored(storage)[SETTING_KEYS.lastRoute]).toBe(`/session/${A}`);
		window.history.pushState(null, "", ROUTE_PATH.home);
		window.dispatchEvent(new PopStateEvent("popstate"));
		expect(stored(storage)[SETTING_KEYS.lastRoute]).toBe(ROUTE_PATH.home);
	});

	test("updateSettings persists what it was given", () => {
		resetSettingsState();
		const storage = fakeStorage();
		restoreSettings(storage);
		updateSettings({ recentDirectories: ["/kept"] });
		expect(stored(storage)[SETTING_KEYS.recentDirectories]).toEqual(["/kept"]);
		expect(getSettings().recentDirectories).toEqual(["/kept"]);
	});

	test("a field this build does not know survives a write", () => {
		resetSettingsState();
		const storage = fakeStorage({
			[SETTINGS_STORAGE_KEY]: blobDocument({
				pluginsEnabled: true,
				plugins: [{ id: "hello-world" }],
			}),
		});
		restoreSettings(storage);
		updateSettings({ recentDirectories: ["/x"] });
		const written = stored(storage);
		expect(written.pluginsEnabled).toBe(true);
		expect(written.plugins).toEqual([{ id: "hello-world" }]);
	});
});

describe("when the stored blob cannot be used", () => {
	test("unreadable text boots on the defaults and is replaced by the first change", () => {
		resetSettingsState();
		const storage = fakeStorage({ [SETTINGS_STORAGE_KEY]: CORRUPT_DOCUMENT_JSON });
		restoreSettings(storage);
		expect(getSettingsSnapshot().notice?.id).toBe("unreadable");
		openTab(sessionTab(A));
		expect(stored(storage)[SETTING_KEYS.tabs]).toEqual({
			tabs: [{ kind: "session", id: A }],
			activeIndex: 0,
		});
	});

	test("a newer build's blob boots on the defaults and stays byte-identical", () => {
		resetSettingsState();
		const storage = fakeStorage({ [SETTINGS_STORAGE_KEY]: TOO_NEW_DOCUMENT_JSON });
		restoreSettings(storage);
		expect(getSettingsSnapshot().notice?.id).toBe("newer");
		expect(openTabIds()).toEqual([]);
		openTab(sessionTab(A));
		updateSettings({ recentDirectories: ["/not-saved"] });
		expect(storage.entries()[SETTINGS_STORAGE_KEY]).toBe(TOO_NEW_DOCUMENT_JSON);
	});
});

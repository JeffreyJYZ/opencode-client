import { afterEach, describe, expect, test } from "bun:test";
import { restoreSettings } from "@/app/settings/store";
import { ROUTE_PATH } from "@/constants/routes";
import { SETTING_KEYS, SETTINGS_STORAGE_KEY } from "@/constants/settings";
import { blobDocument, fakeStorage, openTabIds, resetSettingsState } from "@/test/settings";

/**
 * The written-down behaviour for a stored tab whose session no longer exists
 * (spec 010 §Routes, the M1.5 brief's requirement 4): the tab is kept and its
 * route is restored, so the session view — not the restore — is what reports it.
 */

const GONE = "ses_deleted_long_ago";
const NEVER = "ses_never_existed";

function restoreOneTab(id: string): void {
	resetSettingsState();
	restoreSettings(
		fakeStorage({
			[SETTINGS_STORAGE_KEY]: blobDocument({
				[SETTING_KEYS.tabs]: { tabs: [{ kind: "session", id }], activeIndex: 0 },
				[SETTING_KEYS.lastRoute]: `/session/${id}`,
			}),
		}),
	);
}

afterEach(() => {
	resetSettingsState();
});

describe("a stored tab whose session no longer exists", () => {
	test("is kept, and its route is restored so the session view reports it", () => {
		restoreOneTab(GONE);
		expect(openTabIds()).toEqual([GONE]);
		expect(window.location.pathname).toBe(`/session/${GONE}`);
	});

	test("a never-existing id behaves exactly like a deleted one — the client cannot tell them apart", () => {
		restoreOneTab(NEVER);
		expect(openTabIds()).toEqual([NEVER]);
		expect(window.location.pathname).toBe(`/session/${NEVER}`);
	});

	test("a stored route with no tab behind it leaves the app on home", () => {
		resetSettingsState();
		restoreSettings(
			fakeStorage({
				[SETTINGS_STORAGE_KEY]: blobDocument({
					[SETTING_KEYS.tabs]: { tabs: [], activeIndex: -1 },
					[SETTING_KEYS.lastRoute]: `/session/${GONE}`,
				}),
			}),
		);
		expect(window.location.pathname).toBe(ROUTE_PATH.home);
	});

	test("a stored settings route with no settings tab leaves the app on home", () => {
		resetSettingsState();
		restoreSettings(
			fakeStorage({
				[SETTINGS_STORAGE_KEY]: blobDocument({
					[SETTING_KEYS.tabs]: { tabs: [], activeIndex: -1 },
					[SETTING_KEYS.lastRoute]: ROUTE_PATH.settings,
				}),
			}),
		);
		expect(window.location.pathname).toBe(ROUTE_PATH.home);
	});

	test("a lastRoute the router does not know leaves the app on home", () => {
		resetSettingsState();
		restoreSettings(
			fakeStorage({
				[SETTINGS_STORAGE_KEY]: blobDocument({
					[SETTING_KEYS.tabs]: { tabs: [{ kind: "settings" }], activeIndex: 0 },
					[SETTING_KEYS.lastRoute]: "/session/",
				}),
			}),
		);
		expect(window.location.pathname).toBe(ROUTE_PATH.home);
	});
});

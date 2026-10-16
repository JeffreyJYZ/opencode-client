import { afterEach, describe, expect, test } from "bun:test";
import { DEFAULT_TAB_SCROLL } from "@/app/settings/scroll";
import { getSettings, restoreSettings } from "@/app/settings/store";
import { rememberTabScroll, tabScroll } from "@/app/settings/tabScroll";
import { sessionTab, tabKey } from "@/app/tabModel";
import { closeTab, openTab } from "@/app/tabs";
import { SETTING_KEYS, SETTINGS_STORAGE_KEY } from "@/constants/settings";
import { fakeStorage, resetSettingsState } from "@/test/settings";

/**
 * A remembered scroll belongs to a **tab** (M2.9): written to the one settings blob
 * (spec 010 §Persistence's single field path), read back by the tab's own key, and
 * **released when the tab closes** — the strip is exactly the set of views that
 * exist, so a position for a view that no longer does would be a ghost.
 */

const A = "ses_scroll_a";
const B = "ses_scroll_b";
const KEY_A = tabKey(sessionTab(A));

/** The blob the store just wrote, parsed. */
function stored(storage: ReturnType<typeof fakeStorage>): Record<string, unknown> {
	const raw = storage.entries()[SETTINGS_STORAGE_KEY];
	if (raw === undefined) throw new Error("nothing was written");
	return JSON.parse(raw) as Record<string, unknown>;
}

afterEach(resetSettingsState);

describe("remembering a tab's position", () => {
	test("writes it through the one blob and reads it back by the tab's own key", () => {
		const storage = fakeStorage();
		restoreSettings(storage);
		openTab(sessionTab(A));
		rememberTabScroll(KEY_A, { offset: 120, following: false });
		expect(tabScroll(KEY_A)).toEqual({ offset: 120, following: false });
		expect(stored(storage)[SETTING_KEYS.transcriptScroll]).toEqual({
			[KEY_A]: { offset: 120, following: false },
		});
	});

	test("a tab nobody has scrolled reads the tail-following default", () => {
		const storage = fakeStorage();
		restoreSettings(storage);
		expect(tabScroll("ses_never_opened")).toEqual(DEFAULT_TAB_SCROLL);
		expect(getSettings().transcriptScroll).toEqual({});
	});

	test("a position for a tab that is not open is refused, never stored", () => {
		const storage = fakeStorage();
		restoreSettings(storage);
		openTab(sessionTab(A));
		rememberTabScroll("ses_ghost", { offset: 40, following: false });
		expect(getSettings().transcriptScroll.ses_ghost).toBeUndefined();
		expect(stored(storage)[SETTING_KEYS.transcriptScroll]).toEqual({});
	});

	test("two tabs remember two different positions", () => {
		const storage = fakeStorage();
		restoreSettings(storage);
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		rememberTabScroll(KEY_A, { offset: 120, following: false });
		rememberTabScroll(B, { offset: 0, following: true });
		expect(getSettings().transcriptScroll[KEY_A]).toEqual({ offset: 120, following: false });
		expect(getSettings().transcriptScroll[B]).toEqual({ offset: 0, following: true });
	});

	test("closing a tab releases its position and keeps the other's", () => {
		const storage = fakeStorage();
		restoreSettings(storage);
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		rememberTabScroll(KEY_A, { offset: 120, following: false });
		rememberTabScroll(B, { offset: 8, following: false });
		closeTab(sessionTab(A));
		expect(getSettings().transcriptScroll[KEY_A]).toBeUndefined();
		expect(getSettings().transcriptScroll[B]).toEqual({ offset: 8, following: false });
		expect(tabScroll(KEY_A)).toEqual(DEFAULT_TAB_SCROLL);
	});

	test("the position survives a relaunch's restore", () => {
		const storage = fakeStorage();
		restoreSettings(storage);
		openTab(sessionTab(A));
		rememberTabScroll(KEY_A, { offset: 64, following: false });
		// A second boot on the same blob: the strip and each tab's position come back.
		const kept = storage.entries();
		resetSettingsState();
		restoreSettings(fakeStorage(kept));
		expect(tabScroll(KEY_A)).toEqual({ offset: 64, following: false });
	});
});

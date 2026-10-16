import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { settingsFromDocument } from "@/app/settings/model";
import { clampSidebarWidth } from "@/app/settings/sidebar";
import { setSidebarVisible, setSidebarWidth, toggleSidebar } from "@/app/settings/sidebarActions";
import { readStoredSettings } from "@/app/settings/storage";
import { getSettings, restoreSettings } from "@/app/settings/store";
import { SETTING_KEYS, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "@/constants/settings";
import { fakeStorage, resetSettingsState } from "@/test/settings";

/**
 * M2.7's acceptance, at the seam it names: **the bound lives in the store**, not
 * only in CSS. A drag hands a raw pixel width to `setSidebarWidth`; the store
 * clamps it before it is written, and the blob on disk carries the clamped value
 * — which is what makes a resize survive a reload.
 */

beforeEach(resetSettingsState);
afterEach(resetSettingsState);

describe("the sidebar store writes", () => {
	test("clamps a dragged width to the bound before persisting it", () => {
		restoreSettings(fakeStorage());
		setSidebarWidth(SIDEBAR_MAX_WIDTH + 500);
		expect(getSettings().sidebar.width).toBe(SIDEBAR_MAX_WIDTH);
		setSidebarWidth(1);
		expect(getSettings().sidebar.width).toBe(SIDEBAR_MIN_WIDTH);
	});

	test("a resize survives a reload at the width the bound allows", () => {
		const storage = fakeStorage();
		restoreSettings(storage);
		setSidebarWidth(300);
		// The blob the next launch reads, through the same read path a reload takes.
		const loaded = readStoredSettings(storage);
		expect(loaded.document[SETTING_KEYS.sidebar]).toEqual({
			visible: true,
			narrowVisible: false,
			width: 300,
		});
		expect(settingsFromDocument(loaded.document).sidebar.width).toBe(300);

		// A width beyond the bound is stored clamped, so a reload cannot restore one
		// the store would then have to fight.
		setSidebarWidth(SIDEBAR_MAX_WIDTH * 10);
		const clamped = settingsFromDocument(readStoredSettings(storage).document);
		expect(clamped.sidebar.width).toBe(clampSidebarWidth(SIDEBAR_MAX_WIDTH * 10));
		expect(clamped.sidebar.width).toBe(SIDEBAR_MAX_WIDTH);
	});

	test("⌘B's toggle flips visibility and persists it", () => {
		const storage = fakeStorage();
		restoreSettings(storage);
		expect(getSettings().sidebar.visible).toBe(true);
		toggleSidebar();
		expect(getSettings().sidebar.visible).toBe(false);
		expect(settingsFromDocument(readStoredSettings(storage).document).sidebar.visible).toBe(
			false,
		);
		setSidebarVisible(true);
		expect(getSettings().sidebar.visible).toBe(true);
	});
});

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { settingsRoute } from "@/app/router";
import { sessionTab } from "@/app/tabModel";
import { ensureTabForRoute, openSettingsAndGo } from "@/app/tabSync";
import { getTabSnapshot, openTab, resetTabs } from "@/app/tabs";
import { TAB_KIND } from "@/constants/tabs";
import { resetSettingsState } from "@/test/settings";

/**
 * The "one settings tab" rule (M3.5 requirement 1, spec 010 §Routes): every
 * entry opens the *same* view, and a second press focuses the open tab instead of
 * adding a duplicate. The two paths an entry can take are here — `openSettingsAndGo`
 * (the ⌘, chord, the home button and the palette) and `ensureTabForRoute` (the
 * nav gear, which navigates to `/settings` and lets the route sync open the tab).
 */

afterEach(() => {
	resetTabs();
});

beforeEach(() => {
	resetSettingsState();
});

describe("opening the settings view", () => {
	test("two presses leave exactly one settings tab, active", () => {
		openSettingsAndGo();
		openSettingsAndGo();
		const strip = getTabSnapshot();
		expect(strip.tabs).toHaveLength(1);
		expect(strip.tabs[0].kind).toBe(TAB_KIND.settings);
		expect(strip.activeIndex).toBe(0);
	});

	test("a second press focuses the open tab rather than adding one beside a session", () => {
		openTab(sessionTab("ses_m35_settings_dedup"));
		openSettingsAndGo();
		const firstOpen = getTabSnapshot();
		expect(firstOpen.tabs).toHaveLength(2);
		expect(firstOpen.activeIndex).toBe(1);
		openSettingsAndGo();
		const secondOpen = getTabSnapshot();
		expect(secondOpen.tabs).toHaveLength(2);
		expect(secondOpen.activeIndex).toBe(1);
		expect(secondOpen.tabs[1].kind).toBe(TAB_KIND.settings);
	});

	test("the route sync is idempotent too: /settings opens one tab, not a second", () => {
		ensureTabForRoute(settingsRoute());
		ensureTabForRoute(settingsRoute());
		expect(getTabSnapshot().tabs).toHaveLength(1);
		expect(getTabSnapshot().tabs[0].kind).toBe(TAB_KIND.settings);
	});
});

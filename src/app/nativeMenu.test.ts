import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { dispatchMenuAction } from "@/app/nativeMenu";
import { settingsFromDocument } from "@/app/settings/model";
import { readStoredSettings } from "@/app/settings/storage";
import { restoreSettings } from "@/app/settings/store";
import { getTabSnapshot, openTab, resetTabs } from "@/app/tabs";
import { MENU_ACTION } from "@/constants/appMenu";
import { SETTING_KEYS } from "@/constants/settings";
import { COMMAND_PALETTE_EVENT, NEW_SESSION_EVENT, TAB_KIND } from "@/constants/tabs";
import { fakeStorage, resetSettingsState } from "@/test/settings";

/**
 * M5.3's menu half, at the seam it names: **every item the page owns is
 * answered, by the same action the chord calls**. The signal assertions are the
 * point — a menu row that raised a *new* event would be a second code path, and a
 * second code path is what "a menu item is never the only path" forbids.
 */

beforeEach(() => {
	resetSettingsState();
	resetTabs();
});
afterEach(() => {
	resetSettingsState();
	resetTabs();
});

/** Collect the window events `run` raises. */
function signals(run: () => void, names: readonly string[]): string[] {
	const seen: string[] = [];
	const listeners = names.map((name) => {
		const listener = () => seen.push(name);
		window.addEventListener(name, listener);
		return [name, listener] as const;
	});
	run();
	for (const [name, listener] of listeners) window.removeEventListener(name, listener);
	return seen;
}

describe("the menu's page half", () => {
	test("the new-session item raises the same signal ⌘T does", () => {
		expect(
			signals(() => dispatchMenuAction(MENU_ACTION.newSession), [NEW_SESSION_EVENT]),
		).toEqual([NEW_SESSION_EVENT]);
	});

	test("the palette item raises the same signal ⌘K does", () => {
		expect(
			signals(() => dispatchMenuAction(MENU_ACTION.commandPalette), [COMMAND_PALETTE_EVENT]),
		).toEqual([COMMAND_PALETTE_EVENT]);
	});

	test("the sidebar item flips the store, the way ⌘B does", () => {
		const storage = fakeStorage();
		restoreSettings(storage);
		expect(dispatchMenuAction(MENU_ACTION.toggleSidebar)).toBe(true);
		// The same store and the same serializer every other write uses, so the
		// blob a reload reads already carries the new value.
		const loaded = readStoredSettings(storage);
		expect(settingsFromDocument(loaded.document).sidebar.visible).toBe(false);
		expect(loaded.document[SETTING_KEYS.sidebar]).toEqual({ visible: false, width: 260 });
	});

	test("the close-tab item closes the active tab, the way ⌘W does", () => {
		openTab({ kind: TAB_KIND.session, id: "ses_menu" });
		expect(dispatchMenuAction(MENU_ACTION.closeTab)).toBe(true);
		expect(getTabSnapshot().tabs).toEqual([]);
	});

	test("an id the page does not own is refused, not swallowed", () => {
		// The shell performs reload itself; the page must not claim it.
		expect(dispatchMenuAction(MENU_ACTION.reload)).toBe(false);
		expect(dispatchMenuAction("help.docs")).toBe(false);
		expect(dispatchMenuAction("")).toBe(false);
	});
});

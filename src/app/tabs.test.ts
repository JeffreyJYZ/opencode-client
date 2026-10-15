import { beforeEach, describe, expect, test } from "bun:test";
import { sessionTab, settingsTab, tabKey } from "@/app/tabModel";
import {
	closeActiveTab,
	closeOtherTabs,
	closeTab,
	getTabSnapshot,
	hydrateTabState,
	moveTab,
	notifySessionOutput,
	openTab,
	resetTabs,
	serializeTabState,
} from "@/app/tabs";

const A = "ses_m11_a";
const B = "ses_m11_b";
const C = "ses_m11_c";

const ids = () =>
	getTabSnapshot().tabs.map((tab) => (tab.kind === "session" ? tab.id : "settings"));

beforeEach(() => {
	resetTabs();
});

describe("tabs", () => {
	test("opening an open session activates it instead of duplicating it", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		openTab(sessionTab(A));
		expect(ids()).toEqual([A, B]);
		expect(getTabSnapshot().activeIndex).toBe(0);
	});

	test("closing the active tab activates the next one", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		openTab(sessionTab(C));
		closeTab(sessionTab(B));
		expect(ids()).toEqual([A, C]);
		expect(getTabSnapshot().activeIndex).toBe(1);
	});

	test("closing the last active tab activates the previous one", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		closeTab(sessionTab(B));
		expect(ids()).toEqual([A]);
		expect(getTabSnapshot().activeIndex).toBe(0);
	});

	test("closing the only tab empties the strip", () => {
		openTab(sessionTab(A));
		closeActiveTab();
		expect(ids()).toEqual([]);
		expect(getTabSnapshot().activeIndex).toBe(-1);
	});

	test("closing a tab before the active one keeps the same tab active", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		openTab(sessionTab(C));
		activateBackTo(B);
		closeTab(sessionTab(A));
		expect(ids()).toEqual([B, C]);
		expect(getTabSnapshot().activeIndex).toBe(0);
	});

	test("reorder moves the tab and follows the active one", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		openTab(sessionTab(C));
		activateBackTo(A);
		moveTab(0, 2);
		expect(ids()).toEqual([B, C, A]);
		expect(getTabSnapshot().activeIndex).toBe(2);
		moveTab(9, 0);
		expect(ids()).toEqual([B, C, A]);
	});

	test("close-others keeps exactly the named tab, active", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		openTab(sessionTab(C));
		closeOtherTabs(sessionTab(B));
		expect(ids()).toEqual([B]);
		expect(getTabSnapshot().activeIndex).toBe(0);
	});

	test("the settings view is at most one tab and vanishes when closed", () => {
		openTab(sessionTab(A));
		openTab(settingsTab());
		openTab(settingsTab());
		expect(ids()).toEqual([A, "settings"]);
		closeTab(settingsTab());
		expect(ids()).toEqual([A]);
	});

	test("the snapshot is identity-stable across reads and no-op opens", () => {
		const first = getTabSnapshot();
		expect(getTabSnapshot()).toBe(first);
		openTab(sessionTab(A));
		const second = getTabSnapshot();
		expect(getTabSnapshot()).toBe(second);
		expect(second).not.toBe(first);
	});

	test("unread marks output on an unfocused session and clears on visit", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		notifySessionOutput(A);
		expect(getTabSnapshot().unread.has(tabKey(sessionTab(A)))).toBe(true);
		notifySessionOutput(B);
		expect(getTabSnapshot().unread.has(tabKey(sessionTab(B)))).toBe(false);
		openTab(sessionTab(A));
		expect(getTabSnapshot().unread.has(tabKey(sessionTab(A)))).toBe(false);
	});

	test("the serialized state round-trips for M1.5's blob", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		const blob = serializeTabState();
		resetTabs();
		hydrateTabState(blob);
		expect(ids()).toEqual([A, B]);
		expect(getTabSnapshot().activeIndex).toBe(blob.activeIndex);
		hydrateTabState({ tabs: [], activeIndex: 3 });
		expect(getTabSnapshot().activeIndex).toBe(-1);
	});
});

function activateBackTo(id: string): void {
	openTab(sessionTab(id));
}

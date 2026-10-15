import { beforeEach, describe, expect, test } from "bun:test";
import { sessionTab } from "@/app/tabModel";
import {
	closeOtherTabs,
	getTabSnapshot,
	hydrateTabState,
	moveTab,
	notifySessionOutput,
	openTab,
	resetTabs,
	serializeTabState,
} from "@/app/tabs";

const A = "ses_m11_edge_a";
const B = "ses_m11_edge_b";
const C = "ses_m11_edge_c";

const ids = () =>
	getTabSnapshot().tabs.map((tab) => (tab.kind === "session" ? tab.id : "settings"));

beforeEach(() => resetTabs());

describe("tabs edge cases", () => {
	test("moveTab clamps to both ends", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		openTab(sessionTab(C));
		const backTo = (id: string) => openTab(sessionTab(id));
		backTo(A);
		moveTab(0, -5);
		expect(ids()).toEqual([A, B, C]);
		moveTab(2, 100);
		expect(ids()).toEqual([A, B, C]);
		moveTab(0, 2);
		expect(ids()).toEqual([B, C, A]);
	});

	test("closeOtherTabs with an unknown keep is a no-op", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		closeOtherTabs(sessionTab("ses_unknown"));
		expect(ids()).toEqual([A, B]);
	});

	test("hydrateTabState drops any carried unread marks", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		notifySessionOutput(A);
		expect(getTabSnapshot().unread.size).toBe(1);
		const blob = serializeTabState();
		resetTabs();
		openTab(sessionTab(A));
		notifySessionOutput(A);
		hydrateTabState(blob);
		expect(getTabSnapshot().unread.size).toBe(0);
	});
});

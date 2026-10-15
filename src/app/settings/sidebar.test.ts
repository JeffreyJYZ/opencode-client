import { describe, expect, test } from "bun:test";
import { clampSidebarWidth, normalizeSidebar } from "@/app/settings/sidebar";
import { DEFAULT_SIDEBAR, SIDEBAR_MAX_WIDTH, SIDEBAR_MIN_WIDTH } from "@/constants/settings";

describe("the sidebar cell", () => {
	test("clamps a width into the named bound", () => {
		expect(clampSidebarWidth(SIDEBAR_MAX_WIDTH + 1_000)).toBe(SIDEBAR_MAX_WIDTH);
		expect(clampSidebarWidth(SIDEBAR_MIN_WIDTH - 1_000)).toBe(SIDEBAR_MIN_WIDTH);
		expect(clampSidebarWidth(300)).toBe(300);
		// A fractional drag rounds; a non-finite one falls back, never NaN.
		expect(clampSidebarWidth(300.6)).toBe(301);
		expect(clampSidebarWidth(Number.NaN)).toBe(DEFAULT_SIDEBAR.width);
	});

	test("reads a stored cell defensively, through the same bound", () => {
		expect(normalizeSidebar({ visible: false, width: 9_999 })).toEqual({
			visible: false,
			width: SIDEBAR_MAX_WIDTH,
		});
		expect(normalizeSidebar({ width: 1 })).toEqual({
			visible: DEFAULT_SIDEBAR.visible,
			width: SIDEBAR_MIN_WIDTH,
		});
		expect(normalizeSidebar("not a record")).toEqual(DEFAULT_SIDEBAR);
	});
});

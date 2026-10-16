import { describe, expect, test } from "bun:test";
import { clampSidebarWidth, normalizeSidebar, sidebarShown } from "@/app/settings/sidebar";
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
		expect(normalizeSidebar({ visible: false, narrowVisible: true, width: 9_999 })).toEqual({
			visible: false,
			narrowVisible: true,
			width: SIDEBAR_MAX_WIDTH,
		});
		expect(normalizeSidebar({ width: 1 })).toEqual({
			visible: DEFAULT_SIDEBAR.visible,
			narrowVisible: DEFAULT_SIDEBAR.narrowVisible,
			width: SIDEBAR_MIN_WIDTH,
		});
		expect(normalizeSidebar("not a record")).toEqual(DEFAULT_SIDEBAR);
	});

	test("resolves visibility per window width (M2.25)", () => {
		const shown = { visible: true, narrowVisible: false, width: DEFAULT_SIDEBAR.width };
		// A wide window honours the persisted flag; a narrow one uses its own value,
		// so the persisted open flag alone does not un-hide a fresh narrow window.
		expect(sidebarShown(shown, false)).toBe(true);
		expect(sidebarShown({ ...shown, visible: false }, false)).toBe(false);
		expect(sidebarShown(shown, true)).toBe(false);
		expect(sidebarShown({ ...shown, narrowVisible: true }, true)).toBe(true);
	});
});

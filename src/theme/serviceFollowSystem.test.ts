import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { BUILTIN_THEME, FOLLOW_SYSTEM_MEDIA_QUERY, THEME_MODE } from "@/constants/theme";
import { clearFaults } from "@/plugins/faults";
import { marker, stubMedia, themeFaults } from "@/test/theme";
import {
	activeTheme,
	applyFollowSystem,
	applyTheme,
	clearTheme,
	resetThemeService,
} from "@/theme/service";

/**
 * The follow-system mode **in the service** (M3.6, spec 030 §Theme service): the
 * service is the only writer of `data-theme`, so it owns when the media watch is
 * attached — follow-system in force, and nowhere else. A named theme wins: it
 * detaches the watch, so a later flip moves nothing.
 */

const restorers: Array<() => void> = [];

beforeEach(() => {
	clearFaults();
	resetThemeService();
});

afterEach(() => {
	for (const restore of restorers.splice(0)) restore();
	resetThemeService();
	clearFaults();
});

describe("follow-system in force", () => {
	test("applies the system's mode and re-applies when the system flips", () => {
		const media = stubMedia(false);
		restorers.push(media.restore);

		expect(applyFollowSystem()).toBe(true);
		expect(marker()).toBe(THEME_MODE.light);
		expect(activeTheme()?.id).toBe(BUILTIN_THEME.light.id);
		expect(media.record.query).toBe(FOLLOW_SYSTEM_MEDIA_QUERY);
		expect(media.record.added).toBe(1);

		media.flip(true);
		expect(marker()).toBe(THEME_MODE.dark);
		expect(activeTheme()?.id).toBe(BUILTIN_THEME.dark.id);
		expect(themeFaults()).toHaveLength(0);
	});

	test("a named theme wins: applying one detaches the watch and no flip moves the app", () => {
		const media = stubMedia(true);
		restorers.push(media.restore);
		applyFollowSystem();
		expect(media.count()).toBe(1);

		applyTheme(BUILTIN_THEME.light.id);
		expect(media.record.removed).toBe(1);
		expect(media.count()).toBe(0);
		expect(marker()).toBe(THEME_MODE.light);

		media.flip(true);
		expect(marker()).toBe(THEME_MODE.light);
		expect(activeTheme()?.id).toBe(BUILTIN_THEME.light.id);
	});

	test("clearTheme detaches too, and the reset leaves no watch behind", () => {
		const media = stubMedia(true);
		restorers.push(media.restore);
		applyFollowSystem();
		clearTheme();
		expect(media.count()).toBe(0);

		applyFollowSystem();
		expect(media.count()).toBe(1);
		resetThemeService();
		expect(media.count()).toBe(0);
		expect(marker()).toBeNull();
	});
});

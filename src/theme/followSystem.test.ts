import { afterEach, describe, expect, test } from "bun:test";
import { BUILTIN_THEME, DEFAULT_THEME_ID, FOLLOW_SYSTEM_MEDIA_QUERY } from "@/constants/theme";
import { stubMedia } from "@/test/theme";
import {
	followSystem,
	resolveSystemTheme,
	stopFollowingSystem,
	systemThemeId,
	watchSystemAppearance,
} from "@/theme/followSystem";

/**
 * M3.6's follow-system half in unit form (spec 030 §Theme service). The
 * **resolution** is a pure function of the media state, so both directions are
 * proved with no media query and no timers; the only impure part — the query
 * object and its `change` listener — is proved against a stub. The real OS flip
 * is the user's hand check and is not claimed here.
 */

const restorers: Array<() => void> = [];

afterEach(() => {
	for (const restore of restorers.splice(0)) restore();
	stopFollowingSystem();
});

describe("the resolution is a pure function of the media state", () => {
	test("dark-matches resolves to the built-in dark, its absence to the light", () => {
		expect(resolveSystemTheme(true)).toBe(BUILTIN_THEME.dark.id);
		expect(resolveSystemTheme(false)).toBe(BUILTIN_THEME.light.id);
	});
});

describe("the media edge", () => {
	test("with no media API the theme is the built-in default and the watch is inert", () => {
		const original = window.matchMedia;
		restorers.push(() => {
			window.matchMedia = original;
		});
		(window as { matchMedia?: unknown }).matchMedia = undefined;

		expect(systemThemeId()).toBe(DEFAULT_THEME_ID);
		const stop = watchSystemAppearance(() => {
			throw new Error("a window with no media API cannot flip");
		});
		expect(() => stop()).not.toThrow();
	});

	test("followSystem applies the resolved id once, re-applies on a flip, and stops", () => {
		const media = stubMedia(false);
		restorers.push(media.restore);
		const applied: string[] = [];
		const apply = (id: string): boolean => {
			applied.push(id);
			return true;
		};

		expect(followSystem(apply)).toBe(true);
		expect(applied).toEqual([BUILTIN_THEME.light.id]);
		expect(media.record.query).toBe(FOLLOW_SYSTEM_MEDIA_QUERY);
		expect(media.record.added).toBe(1);
		expect(media.count()).toBe(1);

		media.flip(true);
		expect(applied).toEqual([BUILTIN_THEME.light.id, BUILTIN_THEME.dark.id]);

		// Idempotent: the second call reuses the one watch.
		followSystem(apply);
		expect(media.record.added).toBe(1);
		expect(applied).toHaveLength(3);

		stopFollowingSystem();
		expect(media.record.removed).toBe(1);
		expect(media.count()).toBe(0);
		media.flip(false);
		expect(applied).toHaveLength(3);
	});
});

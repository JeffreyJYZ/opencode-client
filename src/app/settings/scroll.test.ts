import { describe, expect, test } from "bun:test";
import {
	DEFAULT_TAB_SCROLL,
	normalizeTabScroll,
	pruneTabScroll,
	type TabScrollMap,
	withTabScroll,
} from "@/app/settings/scroll";
import { SCROLL_MEMORY_LIMIT } from "@/constants/scroll";

/**
 * The `settings.transcriptScroll` cell, as pure data (M2.9 / spec 010
 * §Persistence). Reading is defensive — the blob is user-writable state — and
 * every edit is identity-stable when nothing changed, which is what lets the
 * settings store tell "no change" from "a change" without a deep compare.
 */

describe("normalizeTabScroll", () => {
	test("keeps a real position and drops everything that is not one", () => {
		const map = normalizeTabScroll({
			tab_a: { offset: 120, following: false },
			tab_b: { offset: "later", following: "no" },
			tab_c: 7,
			"": { offset: 1, following: true },
		});
		expect(map.tab_a).toEqual({ offset: 120, following: false });
		expect(map.tab_b).toEqual({ offset: DEFAULT_TAB_SCROLL.offset, following: true });
		expect(map.tab_c).toBeUndefined();
		expect(map[""]).toBeUndefined();
	});

	test("a negative or non-finite offset reads as zero", () => {
		const map = normalizeTabScroll({
			neg: { offset: -40, following: true },
			nan: { offset: Number.NaN, following: true },
		});
		expect(map.neg?.offset).toBe(0);
		expect(map.nan?.offset).toBe(0);
	});

	test("a blob with nothing in it reads as an empty map", () => {
		expect(normalizeTabScroll(undefined)).toEqual({});
		expect(normalizeTabScroll([])).toEqual({});
	});
});

describe("withTabScroll", () => {
	test("returns the map itself when the position did not move", () => {
		const map: TabScrollMap = { tab_a: { offset: 120, following: false } };
		expect(withTabScroll(map, "tab_a", { offset: 120, following: false })).toBe(map);
		expect(withTabScroll(map, "tab_a", { offset: 121, following: false })).not.toBe(map);
	});

	test("bounds the map, oldest key dropped first", () => {
		let map: TabScrollMap = {};
		for (let at = 0; at < SCROLL_MEMORY_LIMIT + 3; at += 1) {
			map = withTabScroll(map, `tab_${at}`, { offset: at, following: false });
		}
		expect(Object.keys(map)).toHaveLength(SCROLL_MEMORY_LIMIT);
		expect(map.tab_0).toBeUndefined();
		expect(map[`tab_${SCROLL_MEMORY_LIMIT + 2}`]).toEqual({
			offset: SCROLL_MEMORY_LIMIT + 2,
			following: false,
		});
	});
});

describe("pruneTabScroll", () => {
	test("keeps identity when every remembered key still has a tab", () => {
		const map: TabScrollMap = {
			tab_a: { offset: 1, following: false },
			tab_b: { offset: 2, following: true },
		};
		expect(pruneTabScroll(map, ["tab_a", "tab_b"])).toBe(map);
	});

	test("drops the keys with no tab left — a closed tab releases its position", () => {
		const map: TabScrollMap = {
			tab_a: { offset: 1, following: false },
			tab_b: { offset: 2, following: true },
		};
		expect(pruneTabScroll(map, ["tab_b"])).toEqual({
			tab_b: { offset: 2, following: true },
		});
	});
});

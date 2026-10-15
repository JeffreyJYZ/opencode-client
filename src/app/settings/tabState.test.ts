import { describe, expect, test } from "bun:test";
import { normalizeTabs, sameTabs } from "@/app/settings/tabState";

const strip = (raw: unknown) => normalizeTabs(raw);

describe("normalizeTabs", () => {
	test("an entry it cannot build is dropped, duplicates collapse, and the index clamps", () => {
		expect(
			strip({
				tabs: [
					{ kind: "session", id: "ses_a" },
					{ kind: "session", id: "ses_a" },
					{ kind: "session" },
					{ kind: "notes", id: "x" },
					"ses_b",
					{ kind: "settings" },
				],
				activeIndex: 99,
			}),
		).toEqual({
			tabs: [{ kind: "session", id: "ses_a" }, { kind: "settings" }],
			activeIndex: 1,
		});
	});

	test("an empty or unbuildable strip is active-index -1 whatever the blob claimed", () => {
		expect(strip({ tabs: [], activeIndex: 3 })).toEqual({ tabs: [], activeIndex: -1 });
		expect(strip({ tabs: ["ses_bare_string"] })).toEqual({ tabs: [], activeIndex: -1 });
		expect(normalizeTabs(undefined)).toEqual({ tabs: [], activeIndex: -1 });
	});

	test("a negative or fractional index falls back to the first tab", () => {
		const tabs = [{ kind: "session", id: "ses_a" }];
		expect(strip({ tabs, activeIndex: -3 }).activeIndex).toBe(0);
		expect(strip({ tabs, activeIndex: 1.5 }).activeIndex).toBe(0);
	});

	test("the settings view is exactly one tab however many times it is stored", () => {
		expect(strip({ tabs: [{ kind: "settings" }, { kind: "settings" }] }).tabs).toEqual([
			{ kind: "settings" },
		]);
	});
});

describe("sameTabs", () => {
	test("compares tab for tab, and the active index", () => {
		const a = { tabs: [{ kind: "session" as const, id: "ses_a" }], activeIndex: 0 };
		expect(sameTabs(a, { tabs: [...a.tabs], activeIndex: 0 })).toBe(true);
		expect(sameTabs(a, { tabs: [...a.tabs], activeIndex: -1 })).toBe(false);
		expect(sameTabs(a, { tabs: [], activeIndex: 0 })).toBe(false);
	});
});

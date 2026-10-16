import { afterEach, describe, expect, test } from "bun:test";
import { disposeTopnavBuiltins, registerTopnavBuiltins } from "@/app/topnavBuiltins";
import { SETTINGS_SECTION_ID } from "@/constants/settings";
import { TOPNAV_ID, TOPNAV_REGION } from "@/constants/tabs";
import { getSlotContributions } from "@/plugins/registry";

/**
 * The nav's entry count (M3.5 requirement 2): **the settings surface adds no nav
 * entry of its own.** The four ways in are the gear (already registered with M1.1),
 * the ⌘, chord, the home page's button and the palette's section rows — none of
 * which is a nav contribution. This test pins the count, so a later change that
 * puts settings in the nav fails here rather than passing unnoticed.
 */

const BUILTIN_NAV_IDS = [
	TOPNAV_ID.appMark,
	TOPNAV_ID.strip,
	TOPNAV_ID.newSession,
	TOPNAV_ID.picker,
	TOPNAV_ID.gear,
];

function navIds(): string[] {
	const ids: string[] = [];
	for (const slot of Object.values(TOPNAV_REGION)) {
		for (const entry of getSlotContributions(slot)) ids.push(entry.id);
	}
	return ids;
}

afterEach(disposeTopnavBuiltins);

describe("the nav's entries", () => {
	test("are exactly the five built-ins, and none of them is a settings section", () => {
		registerTopnavBuiltins();
		const ids = navIds();
		expect(ids).toHaveLength(BUILTIN_NAV_IDS.length);
		expect([...ids].sort()).toEqual([...BUILTIN_NAV_IDS].sort());
		const sections = Object.values(SETTINGS_SECTION_ID) as string[];
		for (const id of ids) expect(sections).not.toContain(id);
	});

	test("registering the built-ins twice is a no-op, never a duplicate", () => {
		registerTopnavBuiltins();
		registerTopnavBuiltins();
		expect(navIds()).toHaveLength(BUILTIN_NAV_IDS.length);
	});
});

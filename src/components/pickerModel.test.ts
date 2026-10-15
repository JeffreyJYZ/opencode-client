import { describe, expect, test } from "bun:test";
import { emphasize, filterSessions, sessionMatches } from "@/components/pickerModel";
import type { SessionRow } from "@/session/useSessions";
import { pickerRow } from "@/test/picker";

/**
 * The picker's search is pure: the filter and the emphasis are decided here, so
 * a component test never has to re-prove what "matches" means.
 */

const PARSER = pickerRow("ses_a", "Fix the parser", "/dev/monorepos/opencode") as SessionRow;
const TAURI = pickerRow("ses_b", "Untitled", "/dev/apps/tauri-client") as SessionRow;
const TOKENS = pickerRow("ses_c", "Theme tokens", "/dev/apps/other") as SessionRow;

const ALL = [PARSER, TAURI, TOKENS];

describe("pickerModel search", () => {
	test("matches a title, case-insensitively", () => {
		expect(filterSessions(ALL, "PARSER").map((s) => s.id)).toEqual(["ses_a"]);
	});

	test("matches a directory segment, case-insensitively", () => {
		expect(filterSessions(ALL, "MONOREPOS").map((s) => s.id)).toEqual(["ses_a"]);
		expect(filterSessions(ALL, "tauri").map((s) => s.id)).toEqual(["ses_b"]);
	});

	test("a blank query keeps every row in arrival order", () => {
		expect(filterSessions(ALL, "   ").map((s) => s.id)).toEqual(["ses_a", "ses_b", "ses_c"]);
	});

	test("no match is an empty list, not everything", () => {
		expect(filterSessions(ALL, "zzz")).toEqual([]);
		expect(sessionMatches(PARSER, "zzz")).toBe(false);
	});

	test("a query matching a title and a different directory returns both", () => {
		expect(filterSessions(ALL, "the").map((s) => s.id)).toEqual(["ses_a", "ses_c"]);
	});
});

describe("pickerModel emphasis", () => {
	test("marks the matched run and leaves the rest plain", () => {
		expect(emphasize("Fix the parser", "parser")).toEqual([
			{ text: "Fix the ", match: false, at: 0 },
			{ text: "parser", match: true, at: 8 },
		]);
	});

	test("marks every occurrence, case-insensitively", () => {
		expect(emphasize("the theme", "the")).toEqual([
			{ text: "the", match: true, at: 0 },
			{ text: " ", match: false, at: 3 },
			{ text: "the", match: true, at: 4 },
			{ text: "me", match: false, at: 7 },
		]);
	});

	test("a blank query is one plain segment", () => {
		expect(emphasize("Fix the parser", "  ")).toEqual([
			{ text: "Fix the parser", match: false, at: 0 },
		]);
	});

	test("a miss is one plain segment", () => {
		expect(emphasize("Fix the parser", "zzz")).toEqual([
			{ text: "Fix the parser", match: false, at: 0 },
		]);
	});

	test("a leading match has no empty plain segment before it", () => {
		expect(emphasize("Parser", "par")).toEqual([
			{ text: "Par", match: true, at: 0 },
			{ text: "ser", match: false, at: 3 },
		]);
	});
});

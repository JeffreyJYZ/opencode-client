import { afterEach, describe, expect, test } from "bun:test";
import { cleanup } from "@testing-library/react";
import { groupSessionsByDay, lastPathSegment, relativeTime, sessionTitle } from "@/pages/homeModel";

afterEach(cleanup);

const session = (id: string, updated: number, title?: string) =>
	({
		id,
		title,
		parentID: undefined,
		projectID: "p",
		cost: 0,
		tokens: {} as never,
		time: { created: updated, updated },
		location: { directory: "/repo/app/src" },
	}) as never;

describe("homeModel", () => {
	test("groups today vs older with a fixed clock", () => {
		const now = new Date("2026-10-15T12:00:00Z").getTime();
		const todayMs = new Date("2026-10-15T09:00:00Z").getTime();
		const olderMs = new Date("2026-10-13T09:00:00Z").getTime();
		const a = session("a", todayMs);
		const b = session("b", olderMs);
		const groups = groupSessionsByDay([a, b] as never, now);
		expect(groups[0].label).toBe("Today");
		expect(groups[1].label).toBe(new Date(olderMs).toDateString());
	});

	test("newest first within a group is preserved", () => {
		const now = Date.now();
		const newer = session("newer", now - 1000);
		const older = session("older", now - 2000);
		const groups = groupSessionsByDay([newer, older] as never, now);
		expect(groups[0].sessions[0].id).toBe("newer");
		expect(groups[0].sessions[1].id).toBe("older");
	});

	test("untitled fallback", () => {
		const s = session("x", Date.now());
		expect(sessionTitle(s as never)).toBe("Untitled session");
		const t = session("y", Date.now(), "   ");
		expect(sessionTitle(t as never)).toBe("Untitled session");
		const named = session("z", Date.now(), "Hello");
		expect(sessionTitle(named as never)).toBe("Hello");
	});

	test("relative-time boundaries", () => {
		const now = 1_000_000_000_000;
		expect(relativeTime(now - 30_000, now)).toBe("just now");
		expect(relativeTime(now - 5 * 60_000, now)).toBe("5m ago");
		expect(relativeTime(now - 2 * 3_600_000, now)).toBe("2h ago");
		expect(relativeTime(now - 3 * 86_400_000, now)).toBe("3d ago");
	});

	test("last path segment truncated", () => {
		expect(lastPathSegment("/a/b/c")).toBe("c");
		const big = `/root/${"x".repeat(40)}`;
		const seg = lastPathSegment(big);
		expect(seg.length).toBeLessThanOrEqual(24);
	});

	test("day grouping root-only is consumer concern", () => {
		// sanity: empty input yields no groups
		expect(groupSessionsByDay([] as never)).toHaveLength(0);
	});
});

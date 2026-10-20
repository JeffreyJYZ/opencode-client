import { describe, expect, test } from "bun:test";
import { surfacesAfterDismissal } from "@/updates/versions";

/**
 * The one dismissal rule (M5.6): a declined version stays declined, a newer
 * one surfaces again, and an undecidable pair never hides a real update.
 */

describe("surfacesAfterDismissal", () => {
	test("with nothing declined, every release surfaces", () => {
		expect(surfacesAfterDismissal("1.2.3", null)).toBe(true);
	});

	test("the declined version itself stays hidden", () => {
		expect(surfacesAfterDismissal("1.2.3", "1.2.3")).toBe(false);
	});

	test("a newer release surfaces again", () => {
		expect(surfacesAfterDismissal("1.3.0", "1.2.3")).toBe(true);
		expect(surfacesAfterDismissal("2.0.0", "1.99.99")).toBe(true);
		expect(surfacesAfterDismissal("1.2.10", "1.2.9")).toBe(true);
	});

	test("an older release does not surface over a newer dismissal", () => {
		expect(surfacesAfterDismissal("1.2.2", "1.2.3")).toBe(false);
		expect(surfacesAfterDismissal("1.9.0", "1.10.0")).toBe(false);
	});

	test("a version that cannot be compared surfaces, so a real update is never lost", () => {
		expect(surfacesAfterDismissal("1.3.0-rc1", "1.2.3")).toBe(true);
		expect(surfacesAfterDismissal("nightly", "1.2.3")).toBe(true);
	});
});

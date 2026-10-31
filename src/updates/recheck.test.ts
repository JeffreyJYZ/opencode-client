import { afterEach, describe, expect, test } from "bun:test";
import { UPDATE_RECHECK_INTERVAL_MS } from "@/constants/updates";
import { startRechecking } from "@/updates/recheck";

/**
 * The re-check timer (M5.7): a window left open asks again on the interval, and
 * stopping it stops the asking. The tick interval here is milliseconds — the
 * behaviour, not the shipped value, is what these tests own; the constant itself
 * is asserted below so a drift to an absurd interval fails.
 */

const TICK_MS = 5;
const stops: Array<() => void> = [];

afterEach(() => {
	for (const stop of stops.splice(0)) stop();
});

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("the periodic re-check", () => {
	test("asks again on every interval", async () => {
		let calls = 0;
		stops.push(startRechecking(() => calls++, TICK_MS));
		await wait(TICK_MS * 3);
		expect(calls).toBeGreaterThanOrEqual(2);
	});

	test("stopping it stops the asking", async () => {
		let calls = 0;
		const stop = startRechecking(() => calls++, TICK_MS);
		await wait(TICK_MS * 2);
		stop();
		const after = calls;
		await wait(TICK_MS * 3);
		expect(calls).toBe(after);
	});

	test("the shipped interval is hours-scale, never seconds", () => {
		// Read from the constant, so shortening it to debug is caught here rather
		// than by hammering the release endpoint in every running window.
		expect(UPDATE_RECHECK_INTERVAL_MS).toBeGreaterThanOrEqual(60 * 60 * 1000);
	});
});

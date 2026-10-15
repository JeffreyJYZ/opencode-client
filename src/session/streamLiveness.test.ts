import { describe, expect, test } from "bun:test";
import { RECONNECT_BASE_MS, RECONNECT_MAX_MS, STREAM_IDLE_TIMEOUT_MS } from "@/constants/server";
import { createStreamLiveness } from "@/session/streamLiveness";
import { fakeTimers } from "@/test/session";

/** The liveness machine that replaced M0.5's poll: a watchdog and a bounded backoff. */

function make(maxAttempts = 3) {
	const clock = fakeTimers();
	let idles = 0;
	let retries = 0;
	const liveness = createStreamLiveness({
		timers: clock.timers,
		maxAttempts,
		onIdle: () => idles++,
		onRetry: () => retries++,
	});
	return { clock, liveness, idles: () => idles, retries: () => retries };
}

describe("createStreamLiveness", () => {
	test("a stream that never reached the server schedules nothing", () => {
		const { clock, liveness } = make();
		expect(liveness.dropped()).toBe(false);
		expect(clock.pending()).toBe(0);
	});

	test("a silent stream is called dead after the idle timeout", async () => {
		const { clock, liveness, idles } = make();
		liveness.active();
		expect(clock.delays()).toEqual([STREAM_IDLE_TIMEOUT_MS]);
		await clock.runNext();
		expect(idles()).toBe(1);
		expect(clock.pending()).toBe(0);
	});

	test("activity re-arms the watchdog rather than stacking watches", () => {
		const { clock, liveness } = make();
		liveness.active();
		liveness.active();
		expect(clock.pending()).toBe(1);
	});

	test("a dropped live stream backs off from the base delay and reconnects", async () => {
		const { clock, liveness, retries } = make();
		liveness.active();
		expect(liveness.dropped()).toBe(true);
		expect(clock.delays()).toEqual([RECONNECT_BASE_MS]);
		await clock.runNext();
		expect(retries()).toBe(1);
	});

	test("the backoff doubles towards its ceiling, and the budget is bounded", async () => {
		const { clock, liveness } = make(3);
		const delays: number[] = [];
		for (let attempt = 0; attempt < 3; attempt++) {
			liveness.active();
			expect(liveness.dropped()).toBe(true);
			delays.push(clock.delays()[0]);
			await clock.runNext();
		}
		expect(delays).toEqual([
			RECONNECT_BASE_MS,
			Math.min(RECONNECT_BASE_MS * 2, RECONNECT_MAX_MS),
			Math.min(RECONNECT_BASE_MS * 4, RECONNECT_MAX_MS),
		]);
		// The fourth drop is past the budget: the offline state owns it now.
		liveness.active();
		expect(liveness.dropped()).toBe(false);
		expect(clock.pending()).toBe(0);
	});

	test("restart resets the budget and cancels a scheduled retry", async () => {
		const { clock, liveness } = make();
		liveness.active();
		liveness.dropped();
		expect(clock.pending()).toBe(1);
		liveness.restart();
		expect(clock.pending()).toBe(0);
		liveness.active();
		expect(liveness.dropped()).toBe(true);
		expect(clock.delays()).toEqual([RECONNECT_BASE_MS]);
	});

	test("stop leaves nothing scheduled", () => {
		const { clock, liveness } = make();
		liveness.active();
		liveness.dropped();
		liveness.stop();
		expect(clock.pending()).toBe(0);
	});
});

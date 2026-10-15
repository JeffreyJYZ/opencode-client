import type { TimerScheduler } from "@/session/connection";

/**
 * Test doubles for the connection seam. Shared so the store's tests and the
 * provider's tests drive the same behaviour — and so a fake clock keeps the
 * liveness poll deterministic and no test sleeps.
 */

/** A flippable liveness probe: the outcome is the test's, and calls are counted. */
export type FakeProbe = {
	readonly run: () => Promise<void>;
	readonly set: (outcome: "resolve" | "reject") => void;
	readonly calls: () => number;
};

export function fakeProbe(outcome: "resolve" | "reject"): FakeProbe {
	let current = outcome;
	let calls = 0;
	return {
		run: () => {
			calls++;
			return current === "resolve"
				? Promise.resolve()
				: Promise.reject(new Error("ECONNREFUSED"));
		},
		set: (next) => {
			current = next;
		},
		calls: () => calls,
	};
}

export type FakeClock = {
	readonly timers: TimerScheduler;
	readonly pending: () => number;
	readonly delays: () => number[];
	readonly runNext: () => Promise<void>;
};

/** A fake clock: what is scheduled, and running it on demand. */
export function fakeTimers(): FakeClock {
	let sequence = 0;
	const queue = new Map<number, { callback: () => void; delayMs: number }>();
	return {
		timers: {
			schedule: (callback, delayMs) => {
				const id = ++sequence;
				queue.set(id, { callback, delayMs });
				return id;
			},
			cancel: (handle) => {
				queue.delete(handle as number);
			},
		},
		pending: () => queue.size,
		delays: () => [...queue.values()].map((entry) => entry.delayMs),
		async runNext() {
			const next = queue.entries().next().value;
			if (next === undefined) throw new Error("no scheduled callback");
			queue.delete(next[0]);
			next[1].callback();
			await settled();
		},
	};
}

/** Let the in-flight probe's `then` handler run. */
export function settled(): Promise<void> {
	return Bun.sleep(0);
}

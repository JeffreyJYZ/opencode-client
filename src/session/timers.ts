/**
 * The timer seam, so anything on a clock is driven by a fake in a test instead of
 * a sleep. Kept apart from the connection state and the stream so both use one
 * definition of "a scheduler" (spec 050 §Event ingest's watchdog and backoff).
 */

export type TimerScheduler = {
	readonly schedule: (callback: () => void, delayMs: number) => unknown;
	readonly cancel: (handle: unknown) => void;
};

export const SYSTEM_TIMERS: TimerScheduler = {
	schedule: (callback, delayMs) => setTimeout(callback, delayMs),
	cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

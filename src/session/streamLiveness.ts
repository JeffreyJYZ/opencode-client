import {
	RECONNECT_BASE_MS,
	RECONNECT_MAX_ATTEMPTS,
	RECONNECT_MAX_MS,
	STREAM_IDLE_TIMEOUT_MS,
} from "@/constants/server";
import { SYSTEM_TIMERS, type TimerScheduler } from "@/session/timers";

/**
 * **What replaces M0.5's liveness poll** (spec 050 §Event ingest: "reconnect uses a
 * bounded backoff with an idle watchdog").
 *
 * The poll asked `server.info()` every five seconds forever. The stream answers the
 * same question for free: a frame — or a keepalive, which `onActivity` reports —
 * *is* proof the server is there, and the iterator ending or throwing *is* proof it
 * is not. This module turns those two facts into a state machine:
 *
 * - `active()` on every frame and keepalive: alive, and the watchdog is re-armed.
 * - the watchdog fires after `STREAM_IDLE_TIMEOUT_MS` of silence → `onIdle` (the
 *   backstop for a black-holed connection, where the body never ends).
 * - `dropped()` when the iterator ends or throws: reports whether a reconnect was
 *   scheduled. A stream that **never reached the server** schedules nothing — the
 *   offline state owns it and the retry action is the only way back, so a dead
 *   server cannot become a failing-call loop. A stream that *was* live gets a
 *   bounded backoff (`RECONNECT_MAX_ATTEMPTS`), then silence and the banner.
 *
 * Its failure mode if it did not exist: a killed server never moves the app
 * offline, so the banner never returns and the strip's dots freeze — the app looks
 * connected while showing a transcript nothing will ever add to.
 */

export type StreamLiveness = {
	/** The stream produced a frame or a keepalive. */
	active(): void;
	/** The stream ended or threw. `true` when a reconnect is scheduled. */
	dropped(): boolean;
	/** The retry action's fresh start: the budget resets. */
	restart(): void;
	stop(): void;
};

export type LivenessOptions = {
	readonly onIdle: () => void;
	readonly onRetry: () => void;
	readonly timers?: TimerScheduler;
	readonly idleTimeoutMs?: number;
	readonly baseMs?: number;
	readonly maxMs?: number;
	readonly maxAttempts?: number;
};

export function createStreamLiveness(options: LivenessOptions): StreamLiveness {
	const timers = options.timers ?? SYSTEM_TIMERS;
	const idleTimeoutMs = options.idleTimeoutMs ?? STREAM_IDLE_TIMEOUT_MS;
	const baseMs = options.baseMs ?? RECONNECT_BASE_MS;
	const maxMs = options.maxMs ?? RECONNECT_MAX_MS;
	const maxAttempts = options.maxAttempts ?? RECONNECT_MAX_ATTEMPTS;
	let watchdog: unknown = null;
	let scheduled: unknown = null;
	let attempt = 0;
	let live = false;

	function clearWatchdog(): void {
		if (watchdog === null) return;
		timers.cancel(watchdog);
		watchdog = null;
	}

	function clearScheduled(): void {
		if (scheduled === null) return;
		timers.cancel(scheduled);
		scheduled = null;
	}

	function active(): void {
		live = true;
		clearWatchdog();
		watchdog = timers.schedule(() => {
			watchdog = null;
			options.onIdle();
		}, idleTimeoutMs);
	}

	function dropped(): boolean {
		clearWatchdog();
		const wasLive = live;
		live = false;
		if (!wasLive) {
			attempt = 0;
			return false;
		}
		attempt += 1;
		if (attempt > maxAttempts) {
			attempt = 0;
			return false;
		}
		const delayMs = Math.min(baseMs * 2 ** (attempt - 1), maxMs);
		scheduled = timers.schedule(() => {
			scheduled = null;
			options.onRetry();
		}, delayMs);
		return true;
	}

	function restart(): void {
		clearScheduled();
		clearWatchdog();
		attempt = 0;
		live = false;
	}

	function stop(): void {
		restart();
	}

	return { active, dropped, restart, stop };
}

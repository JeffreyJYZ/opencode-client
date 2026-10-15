import { CONNECTION_POLL_MS } from "@/constants/server";
import {
	CONNECTION_STATUS,
	type ConnectionState,
	reasonOf,
	sameState,
} from "@/session/connectionState";
import type { ResolvedTarget } from "@/session/target";

/**
 * The connection state machine (spec 050 §Target and auth): the transitions of
 * `connectionState.ts`, driven by one liveness probe.
 *
 * One skipped probe moves it offline; the **retry action** is the only thing
 * that moves it back — an offline connection schedules nothing, so there is no
 * failing-call loop. While online a bounded poll asks again, which is how a
 * killed server is noticed before M2.1's event stream does it.
 */

/** Resolve = reachable, reject = not. The probe's rejection is data, never an escape. */
export type ConnectionProbe = () => Promise<unknown>;

/** The timer seam, so the poll is tested with a fake clock instead of a sleep. */
export type TimerScheduler = {
	readonly schedule: (callback: () => void, delayMs: number) => unknown;
	readonly cancel: (handle: unknown) => void;
};

export const SYSTEM_TIMERS: TimerScheduler = {
	schedule: (callback, delayMs) => setTimeout(callback, delayMs),
	cancel: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type ConnectionStore = {
	getState(): ConnectionState;
	subscribe(listener: () => void): () => void;
	/** Probe now. The initial connect and the retry action are the same call. */
	check(): Promise<void>;
	/** A call that failed elsewhere moves the app offline, naming the url it tried. */
	reportFailure(error: unknown): void;
	/** Stop the poll and drop the listeners. The state stays readable. */
	dispose(): void;
};

export type ConnectionOptions = {
	readonly target: ResolvedTarget | null;
	readonly probe: ConnectionProbe;
	/** 0 disables the liveness poll (the default in tests). */
	readonly pollMs?: number;
	readonly timers?: TimerScheduler;
};

export function createConnectionStore(options: ConnectionOptions): ConnectionStore {
	const { target, probe } = options;
	const pollMs = options.pollMs ?? CONNECTION_POLL_MS;
	const timers = options.timers ?? SYSTEM_TIMERS;
	const listeners = new Set<() => void>();
	let state: ConnectionState =
		target === null
			? { status: CONNECTION_STATUS.none }
			: { status: CONNECTION_STATUS.unknown, url: target.url };
	let inFlight: Promise<void> | null = null;
	let handle: unknown = null;

	function transition(next: ConnectionState): void {
		if (sameState(state, next)) return;
		state = next;
		for (const listener of [...listeners]) listener();
	}

	function cancelPoll(): void {
		if (handle === null) return;
		timers.cancel(handle);
		handle = null;
	}

	function schedulePoll(): void {
		cancelPoll();
		if (pollMs <= 0) return;
		handle = timers.schedule(() => {
			handle = null;
			void check();
		}, pollMs);
	}

	/** One probe at a time: a double-clicked retry must not become two requests. */
	function check(): Promise<void> {
		const current = state;
		if (current.status === CONNECTION_STATUS.none) return Promise.resolve();
		if (inFlight !== null) return inFlight;
		const url = current.url;
		inFlight = probe().then(
			() => {
				inFlight = null;
				transition({ status: CONNECTION_STATUS.online, url });
				schedulePoll();
			},
			(error: unknown) => {
				inFlight = null;
				transition({ status: CONNECTION_STATUS.offline, url, reason: reasonOf(error) });
				cancelPoll();
			},
		);
		return inFlight;
	}

	function reportFailure(error: unknown): void {
		const current = state;
		if (current.status === CONNECTION_STATUS.none) return;
		const url = current.url;
		transition({ status: CONNECTION_STATUS.offline, url, reason: reasonOf(error) });
		cancelPoll();
	}

	function subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}

	function dispose(): void {
		cancelPoll();
		listeners.clear();
	}

	return { getState: () => state, subscribe, check, reportFailure, dispose };
}

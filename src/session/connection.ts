import {
	CONNECTION_STATUS,
	type ConnectionState,
	reasonOf,
	sameState,
} from "@/session/connectionState";
import type { ResolvedTarget } from "@/session/target";

/**
 * The connection state machine (spec 050 §Target and auth): the transitions of
 * `connectionState.ts`, driven by the **event stream**, plus the one probe the
 * initial connect and the retry action share.
 *
 * M2.1 deleted the liveness poll that used to sit here. `reportOnline` is its
 * replacement's other half: the stream (`sessionIngest.ts`) reports a live
 * connection, a dropped one or an idle one, and this store only turns those into
 * states. An offline connection still schedules nothing — the bounded reconnect
 * belongs to the stream, and the retry action is the way back.
 */

/** Resolve = reachable, reject = not. The probe's rejection is data, never an escape. */
export type ConnectionProbe = () => Promise<unknown>;

export type ConnectionStore = {
	getState(): ConnectionState;
	subscribe(listener: () => void): () => void;
	/** Probe now. The initial connect and the retry action are the same call. */
	check(): Promise<void>;
	/** The event stream is live: the app is online. */
	reportOnline(): void;
	/** The stream dropped, an idle watchdog fired, or a call failed elsewhere. */
	reportFailure(error: unknown): void;
	/** Drop the listeners. The state stays readable. */
	dispose(): void;
};

export type ConnectionOptions = {
	readonly target: ResolvedTarget | null;
	readonly probe: ConnectionProbe;
};

export function createConnectionStore(options: ConnectionOptions): ConnectionStore {
	const { target, probe } = options;
	const listeners = new Set<() => void>();
	let state: ConnectionState =
		target === null
			? { status: CONNECTION_STATUS.none }
			: { status: CONNECTION_STATUS.unknown, url: target.url };
	let inFlight: Promise<void> | null = null;

	function transition(next: ConnectionState): void {
		if (sameState(state, next)) return;
		state = next;
		for (const listener of [...listeners]) listener();
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
			},
			(error: unknown) => {
				inFlight = null;
				transition({ status: CONNECTION_STATUS.offline, url, reason: reasonOf(error) });
			},
		);
		return inFlight;
	}

	function reportOnline(): void {
		const current = state;
		if (current.status === CONNECTION_STATUS.none) return;
		if (current.status === CONNECTION_STATUS.online) return;
		transition({ status: CONNECTION_STATUS.online, url: current.url });
	}

	function reportFailure(error: unknown): void {
		const current = state;
		if (current.status === CONNECTION_STATUS.none) return;
		transition({
			status: CONNECTION_STATUS.offline,
			url: current.url,
			reason: reasonOf(error),
		});
	}

	function subscribe(listener: () => void): () => void {
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	}

	function dispose(): void {
		listeners.clear();
	}

	return { getState: () => state, subscribe, check, reportOnline, reportFailure, dispose };
}

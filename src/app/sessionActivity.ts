import { useEffect, useSyncExternalStore } from "react";
import { SESSION_ACTIVE_POLL_MS } from "@/constants/tabs";
import { useClient } from "@/session/ClientProvider";
import type { OpenCodeClient } from "@/session/client";

/**
 * Which sessions are running, for the strip's status dots (spec 010 §Top nav).
 *
 * Today the honest source is `session.active()` read on mount and on a poll —
 * the event stream that supersedes it is M2.1's. A failed read keeps the last
 * state rather than blanking every dot; the offline banner owns the error.
 */

const EMPTY_SET: ReadonlySet<string> = new Set();
let running: ReadonlySet<string> = EMPTY_SET;
let clientPresent = false;
const listeners = new Set<() => void>();

function publish(next: ReadonlySet<string>): void {
	running = next;
	for (const listener of [...listeners]) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getActivitySnapshot(): ReadonlySet<string> {
	return running;
}

function readSnapshot(): ReadonlySet<string> {
	return clientPresent ? running : EMPTY_SET;
}

/** One read of `session.active()`; the ids present are running. */
export async function refreshActivity(client: OpenCodeClient): Promise<void> {
	const active = await client.session.active();
	const keys = Object.keys(active);
	if (keys.length === running.size && keys.every((key) => running.has(key))) {
		// Reuse the previous set so unchanged polls keep snapshot identity.
		return;
	}
	publish(new Set(keys));
}

/**
 * Poll until stopped. Returns the stop function; calling it twice is safe.
 * M2.1 deletes this and drives `publish` from the stream instead.
 */
export function startActivityPolling(client: OpenCodeClient): () => void {
	let stopped = false;
	const poll = () => {
		if (stopped) return;
		void refreshActivity(client).catch(() => {
			// Keep the last state; the banner owns the failure.
		});
	};
	poll();
	const timer = setInterval(poll, SESSION_ACTIVE_POLL_MS);
	return () => {
		stopped = true;
		clearInterval(timer);
	};
}

/** The running ids now; starts the poll for the app's client on mount. */
export function useSessionActivity(): ReadonlySet<string> {
	const client = useClient();
	useEffect(() => {
		if (client === null) {
			clientPresent = false;
			publish(EMPTY_SET);
			return;
		}
		clientPresent = true;
		return startActivityPolling(client);
	}, [client]);
	return useSyncExternalStore(subscribe, readSnapshot);
}

/** The tests' reset; production never calls it. */
export function resetActivity(): void {
	clientPresent = false;
	publish(EMPTY_SET);
}

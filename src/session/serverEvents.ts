import type { V2Event } from "@opencode/client";

/**
 * The app's one server-event stream, fanned out (M4.10, spec 040 §The host,
 * `opencode.on`): `sessionIngest.ts` publishes every frame it receives here, and
 * a plugin's host subscribes through `PluginEventSource`.
 *
 * It is a fan-out and not a second subscription because the app deliberately keeps
 * **one** subscription for the whole server (`sessionIngest.ts`, spec 050 §Event
 * ingest). A plugin therefore taps the same stream the app already reads, at the
 * point before the ingest's own session filter — a plugin sees the whole stream the
 * server sends, which is what `opencode.on("mcp.*")` and its like require.
 *
 * A subscriber is notified with the raw frame; a handler that throws cannot break
 * the ingest loop, because the loop's own call site guards nothing and this module
 * only ever forwards. `PluginOpenCode` is what filters by pattern.
 */

const listeners = new Set<(event: V2Event) => void>();

/** Forward one received frame to every subscriber. */
export function publishServerEvent(event: V2Event): void {
	for (const handler of [...listeners]) handler(event);
}

export function subscribeToServerEvents(handler: (event: V2Event) => void): () => void {
	listeners.add(handler);
	return () => {
		listeners.delete(handler);
	};
}

/** The tests' reset; production never calls it. */
export function clearServerEvents(): void {
	listeners.clear();
}

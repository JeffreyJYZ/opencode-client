/**
 * The app-event bus a plugin reaches through `host.on` (spec 040 §The host,
 * `on`): `turn-start`, `turn-end`, `chunk`, `session-changed`, `settings-changed`,
 * `plugin-loaded`, `plugin-unloaded`, `theme-changed`.
 *
 * The vocabulary is open on purpose — the names above are what the app emits, and
 * a subscription to a name nothing emits is simply never called, so a typo is
 * inert rather than a throw. `emitAppEvent` is the app's half; M4.5 and the
 * surfaces that produce these events call it.
 */

export type AppEventHandler = (payload: unknown) => void;

const listeners = new Map<string, Set<AppEventHandler>>();

/** Subscribe to one app event; the returned function is the unsubscribe. */
export function onAppEvent(event: string, handler: AppEventHandler): () => void {
	const set = listeners.get(event) ?? new Set<AppEventHandler>();
	listeners.set(event, set);
	set.add(handler);
	return () => {
		set.delete(handler);
		if (set.size === 0) listeners.delete(event);
	};
}

/** Emit one app event to every subscriber of that name. */
export function emitAppEvent(event: string, payload?: unknown): void {
	for (const handler of [...(listeners.get(event) ?? [])]) handler(payload);
}

/** The tests' reset; production never calls it. */
export function clearAppEvents(): void {
	listeners.clear();
}

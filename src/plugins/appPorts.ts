import type { HostDeps } from "@/plugins/host";

/**
 * **The app's live host ports** (M4.10, spec 040 §The host): the one place the
 * app publishes its own client, event source, transcript reader, storage and
 * notifier for the loader to build a plugin's host from.
 *
 * It is a module, not a React context, for the reason the loader is one: the
 * manager is created when its module is imported, **before** any component
 * renders, so the ports cannot be passed in by value at construction time. The
 * app publishes them once its client exists (`src/app/AppPorts.tsx`); the loader
 * reads the **current** ports on every activation, so a plugin enabled while the
 * app is connected gets the connected client, never a null captured at import.
 *
 * The snapshot is read live, never copied past this module: `getAppPorts()`
 * returns the current object, and a subscriber is only told that it changed.
 */

let ports: HostDeps = {};
const listeners = new Set<() => void>();

export function getAppPorts(): HostDeps {
	return ports;
}

/** Publish the app's ports. Called once the client bundle exists, and on every change. */
export function setAppPorts(next: HostDeps): void {
	ports = next;
	for (const listener of [...listeners]) listener();
}

export function subscribeToAppPorts(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The tests' reset; production never calls it. */
export function resetAppPorts(): void {
	ports = {};
	for (const listener of [...listeners]) listener();
}

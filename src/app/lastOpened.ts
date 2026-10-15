import { useSyncExternalStore } from "react";

/**
 * In-memory "continue where you left off" seam (M1.2).
 *
 * Persistence is M1.5's: it feeds the id through `hydrateLastOpened` (startup)
 * and writes the same id back from `setLastOpened` (or from the route it owns).
 * The client never persists here, so nothing survives a reload yet by design.
 */

let current: string | null = null;
const listeners = new Set<() => void>();

function publish(): void {
	for (const listener of [...listeners]) listener();
}

export function getLastOpenedSessionId(): string | null {
	return current;
}

export function setLastOpenedSession(id: string): void {
	if (current === id) return;
	current = id;
	publish();
}

export function clearLastOpenedSession(): void {
	if (current === null) return;
	current = null;
	publish();
}

/** M1.5's hydration entry point. */
export function hydrateLastOpenedSession(id: string | null): void {
	if (current === id) return;
	current = id;
	publish();
}

export function subscribeLastOpened(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function useLastOpenedSessionId(): string | null {
	return useSyncExternalStore(subscribeLastOpened, getLastOpenedSessionId);
}

import { REASONING_EXPANSION_MEMORY } from "@/constants/transcript";

/**
 * The reasoning groups a reader has opened (M2.17, spec 020 §Transcript: "expanded
 * state remembered per session").
 *
 * **The finding this store exists for**: no expansion memory was here. M2.9's
 * memory is a *tab's scroll* in the settings blob (`src/app/settings/scroll.ts`),
 * and nothing remembered an expansion — so a group collapsed again the moment its
 * view unmounted, which a session switch does. This is the smallest honest store
 * that fixes it: a module-level map, subscribed with `useSyncExternalStore`, so the
 * state outlives the row and the view.
 *
 * **Keyed by the row id, which is already session-scoped** — a row id is
 * `${messageID}:r${ordinal}` and a message id is unique on the server, so
 * remembering by row id *is* remembering per session, and no row component needs a
 * session prop it is not handed. The map is bounded (`REASONING_EXPANSION_MEMORY`,
 * oldest dropped), so it cannot grow roots for parts long gone.
 *
 * It is deliberately **not persisted**: spec 020's acceptance is that the state
 * survives a session switch, not a relaunch, and putting it in the settings blob
 * would mean a schema version for a view flag.
 */

const expanded = new Map<string, true>();
const listeners = new Set<() => void>();

/** Whether this group is open. */
export function isReasoningExpanded(rowID: string): boolean {
	return expanded.has(rowID);
}

/** Open or close one group; a no-op change does not notify. */
export function setReasoningExpanded(rowID: string, value: boolean): void {
	if (value === expanded.has(rowID)) return;
	if (value) {
		expanded.set(rowID, true);
		// Insertion order is age: the first key is the oldest, so it goes first.
		while (expanded.size > REASONING_EXPANSION_MEMORY) {
			const oldest = expanded.keys().next().value;
			if (oldest === undefined) break;
			expanded.delete(oldest);
		}
	} else {
		expanded.delete(rowID);
	}
	for (const listener of [...listeners]) listener();
}

export function subscribeReasoningExpansion(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Drop every remembered group — the test seam, and the "start over" the store has none of. */
export function resetReasoningExpansion(): void {
	expanded.clear();
	for (const listener of [...listeners]) listener();
}

import { type SerializedTabs, sameTab, type Tab, type TabSnapshot, tabKey } from "@/app/tabModel";
import { TAB_KIND } from "@/constants/tabs";

/**
 * The tab store (spec 010 §Top nav). No React in it — `useTabs.ts` subscribes.
 * The model lives in `tabModel.ts`; this file owns the mutation rules only.
 * Closing a tab never touches the server; persistence is M1.5's seam
 * (`serializeTabState` / `hydrateTabState`, shaped like `settings.tabs`).
 * Snapshots are identity-stable, so `useSyncExternalStore` settles (M0.4).
 */

export type { SerializedTabs, Tab, TabSnapshot };

let tabs: readonly Tab[] = [];
let activeIndex = -1;
let unread: ReadonlySet<string> = new Set();
let snapshot: TabSnapshot = { tabs, activeIndex, unread };

const listeners = new Set<() => void>();

function publish(): void {
	snapshot = { tabs, activeIndex, unread };
	for (const listener of [...listeners]) listener();
}

function indexOf(tab: Tab): number {
	return tabs.findIndex((existing) => sameTab(existing, tab));
}

export function subscribeToTabs(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getTabSnapshot(): TabSnapshot {
	return snapshot;
}

function activateAt(index: number): void {
	if (index === activeIndex) return;
	activeIndex = index;
	if (index >= 0) {
		const key = tabKey(tabs[index]);
		if (unread.has(key)) {
			const next = new Set(unread);
			next.delete(key);
			unread = next;
		}
	}
	publish();
}

/** Open a view, or activate it when it is already open. Idempotent. */
export function openTab(tab: Tab): void {
	const at = indexOf(tab);
	if (at === -1) {
		tabs = [...tabs, tab];
		activeIndex = tabs.length - 1;
		publish();
	} else {
		activateAt(at);
	}
}

export function activateTab(tab: Tab): void {
	const at = indexOf(tab);
	if (at !== -1) activateAt(at);
}

/** Close one view; closing the active tab activates the next, else the previous. */
export function closeTab(tab: Tab): void {
	const at = indexOf(tab);
	if (at === -1) return;
	tabs = [...tabs.slice(0, at), ...tabs.slice(at + 1)];
	if (tabs.length === 0) {
		activeIndex = -1;
	} else if (at < activeIndex) {
		activeIndex -= 1;
	} else if (at === activeIndex) {
		activeIndex = Math.min(at, tabs.length - 1);
	}
	publish();
}

export function closeActiveTab(): void {
	if (activeIndex >= 0) closeTab(tabs[activeIndex]);
}

export function closeOtherTabs(keep: Tab): void {
	const at = indexOf(keep);
	if (at === -1) return;
	tabs = [tabs[at]];
	activeIndex = 0;
	publish();
}

/** Move the tab at `from` to `to`, clamping both ends into the strip. */
export function moveTab(from: number, to: number): void {
	if (from < 0 || from >= tabs.length) return;
	const clamped = Math.max(0, Math.min(to, tabs.length - 1));
	if (clamped === from) return;
	const next = [...tabs];
	const [moved] = next.splice(from, 1);
	next.splice(clamped, 0, moved);
	const active = activeIndex >= 0 ? tabs[activeIndex] : undefined;
	tabs = next;
	activeIndex = active === undefined ? -1 : next.findIndex((tab) => sameTab(tab, active));
	publish();
}

/**
 * The M2.1 seam: the event ingest calls this when a session produces output.
 * The active tab never marks — it is being watched. Visiting clears the mark.
 */
export function notifySessionOutput(sessionId: string): void {
	const active = activeIndex >= 0 ? tabs[activeIndex] : undefined;
	if (active?.kind === TAB_KIND.session && active.id === sessionId) return;
	if (unread.has(sessionId)) return;
	unread = new Set(unread).add(sessionId);
	publish();
}

export function serializeTabState(): SerializedTabs {
	return { tabs, activeIndex };
}

/** The M1.5 seam's other half: restore a blob the store itself never wrote. */
export function hydrateTabState(state: SerializedTabs): void {
	tabs = [...state.tabs];
	activeIndex =
		tabs.length === 0 ? -1 : Math.max(0, Math.min(state.activeIndex, tabs.length - 1));
	unread = new Set();
	publish();
}

/** The tests' reset; production never calls it. */
export function resetTabs(): void {
	tabs = [];
	activeIndex = -1;
	unread = new Set();
	publish();
}

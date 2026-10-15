import { useSyncExternalStore } from "react";
import { getTabSnapshot, subscribeToTabs, type Tab, type TabSnapshot } from "@/app/tabs";

/**
 * The only places a component subscribes to the tab store (spec 010 §Top nav).
 * The store's snapshot is identity-stable, so neither hook re-renders forever.
 */

/** The whole strip: every open view, the active index, the unread marks. */
export function useTabs(): TabSnapshot {
	return useSyncExternalStore(subscribeToTabs, getTabSnapshot);
}

/** The active view, or `undefined` when the strip is empty. */
export function useActiveTab(): Tab | undefined {
	const snapshot = useTabs();
	return snapshot.activeIndex >= 0 ? snapshot.tabs[snapshot.activeIndex] : undefined;
}

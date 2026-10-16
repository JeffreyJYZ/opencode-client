import { DEFAULT_TAB_SCROLL, type TabScroll, withTabScroll } from "@/app/settings/scroll";
import { getSettings, updateSettings } from "@/app/settings/store";
import { tabKey } from "@/app/tabModel";
import { getTabSnapshot } from "@/app/tabs";

/**
 * The read/write seam for a **tab's** remembered scroll (M2.9): the settings blob
 * is the store (spec 010 §Persistence's one field path), and this module is the
 * only place a transcript view touches it.
 *
 * A write happens when a tab is **left**, not on every scroll frame: the blob is
 * one JSON document, and a per-frame write would rewrite it sixty times a second.
 * The live position during a tab's life lives in the view; the blob holds where
 * each tab was put down.
 */

/** What a tab left behind, or the tail-following default for one never scrolled. */
export function tabScroll(key: string): TabScroll {
	return getSettings().transcriptScroll[key] ?? DEFAULT_TAB_SCROLL;
}

/** Every open tab's key — the set a remembered position may exist for. */
export function openTabKeys(): readonly string[] {
	return getTabSnapshot().tabs.map(tabKey);
}

/**
 * Remember what a tab left behind. A key with **no open tab is released**, not
 * stored: a tab's own close runs before its view saves, so a position for a view
 * that no longer exists is dropped rather than resurrected.
 */
export function rememberTabScroll(key: string, memory: TabScroll): void {
	if (!openTabKeys().includes(key)) return;
	const current = getSettings().transcriptScroll;
	const next = withTabScroll(current, key, memory);
	if (next !== current) updateSettings({ transcriptScroll: next });
}

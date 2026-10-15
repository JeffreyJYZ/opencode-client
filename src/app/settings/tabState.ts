import { type SerializedTabs, sameTab, type Tab } from "@/app/tabModel";
import { TAB_KIND } from "@/constants/tabs";

/**
 * The `settings.tabs` cell: the strip as a document, and back (spec 010
 * §Persistence). Reading is defensive — the blob is user-writable state — so a
 * wrong entry is dropped rather than allowed to reach the tab store.
 */

export function normalizeTabs(raw: unknown): SerializedTabs {
	const record = isRecord(raw) ? raw : {};
	const entries = Array.isArray(record.tabs) ? record.tabs : [];
	const tabs: Tab[] = [];
	for (const entry of entries) {
		const tab = normalizeTab(entry);
		if (tab === null) continue;
		if (tabs.some((existing) => sameTab(existing, tab))) continue;
		tabs.push(tab);
	}
	if (tabs.length === 0) return { tabs: [], activeIndex: -1 };
	const rawIndex = record.activeIndex;
	const index =
		typeof rawIndex === "number" && Number.isInteger(rawIndex)
			? Math.max(0, Math.min(rawIndex, tabs.length - 1))
			: 0;
	return { tabs, activeIndex: index };
}

function normalizeTab(entry: unknown): Tab | null {
	if (!isRecord(entry)) return null;
	if (entry.kind === TAB_KIND.settings) return { kind: TAB_KIND.settings };
	if (entry.kind === TAB_KIND.session && typeof entry.id === "string" && entry.id !== "") {
		return { kind: TAB_KIND.session, id: entry.id };
	}
	return null;
}

/** The same strip, tab for tab: what makes "no change" cheap to detect. */
export function sameTabs(a: SerializedTabs, b: SerializedTabs): boolean {
	return (
		a.activeIndex === b.activeIndex &&
		a.tabs.length === b.tabs.length &&
		a.tabs.every((tab, index) => sameTab(tab, b.tabs[index]))
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

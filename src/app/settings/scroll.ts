import { SCROLL_MEMORY_LIMIT } from "@/constants/scroll";

/**
 * The `settings.transcriptScroll` cell: one tab's remembered position, and back
 * (spec 010 §Persistence). **Per *tab*, never per session id** — a tab is a view
 * (spec 010 §Routes), and a memory keyed by session would follow a session into a
 * strip that had nothing to do with where the reader was.
 *
 * Pure: reading is defensive because the blob is user-writable state, and every
 * edit returns the same map by reference when nothing changed, so the settings
 * store can tell "no change" from "a change" without a deep compare.
 */

/** Where one tab's transcript was left, and whether it was following the tail. */
export type TabScroll = {
	readonly offset: number;
	/** `true` for a tab that was pinned to the tail when it was left. */
	readonly following: boolean;
};

export type TabScrollMap = Readonly<Record<string, TabScroll>>;

/** A tab nobody has scrolled: following, with no offset of its own. */
export const DEFAULT_TAB_SCROLL: TabScroll = { offset: 0, following: true };

/** No tab remembers anything — the fresh document's value. */
export const NO_TAB_SCROLL: TabScrollMap = {};

/** Read the cell: a wrong entry is dropped rather than allowed to reach a viewport. */
export function normalizeTabScroll(raw: unknown): TabScrollMap {
	const record = isRecord(raw) ? raw : {};
	const next: Record<string, TabScroll> = {};
	for (const [key, value] of Object.entries(record)) {
		if (key === "" || !isRecord(value)) continue;
		const offset =
			typeof value.offset === "number" && Number.isFinite(value.offset)
				? Math.max(0, value.offset)
				: DEFAULT_TAB_SCROLL.offset;
		next[key] = { offset, following: value.following !== false };
		if (Object.keys(next).length >= SCROLL_MEMORY_LIMIT) break;
	}
	return next;
}

/** The map with `key` set, bounded to `SCROLL_MEMORY_LIMIT` tabs (oldest dropped). */
export function withTabScroll(map: TabScrollMap, key: string, memory: TabScroll): TabScrollMap {
	const existing = map[key];
	if (existing?.offset === memory.offset && existing.following === memory.following) return map;
	const next: Record<string, TabScroll> = { ...map, [key]: memory };
	const keys = Object.keys(next);
	if (keys.length <= SCROLL_MEMORY_LIMIT) return next;
	const bounded: Record<string, TabScroll> = {};
	for (const kept of keys.slice(keys.length - SCROLL_MEMORY_LIMIT)) bounded[kept] = next[kept];
	return bounded;
}

/**
 * The map with every key that is not in `keys` dropped — a **closed tab releases
 * its position** (M2.9's acceptance), so the blob cannot grow roots for views that
 * no longer exist.
 */
export function pruneTabScroll(map: TabScrollMap, keys: readonly string[]): TabScrollMap {
	const open = new Set(keys);
	let dropped = false;
	const next: Record<string, TabScroll> = {};
	for (const [key, memory] of Object.entries(map)) {
		if (open.has(key)) next[key] = memory;
		else dropped = true;
	}
	return dropped ? next : map;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

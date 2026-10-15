import { RECENT_DIRECTORIES_LIMIT } from "@/constants/directories";

/**
 * Append `directory` to the recent list, deduped and newest-first, capped.
 * Pure: returns the next list. Persistence (settings.recentDirectories, M1.5)
 * owns writing; this owns only the shape.
 */
export function addRecentDirectory(list: readonly string[], directory: string): string[] {
	const next = [directory, ...list.filter((entry) => entry !== directory)];
	return next.slice(0, RECENT_DIRECTORIES_LIMIT);
}

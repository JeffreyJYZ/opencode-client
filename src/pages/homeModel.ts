import {
	RECENT_DIRECTORY_MAX_CHARS,
	RELATIVE_TIME_DAY_MS,
	RELATIVE_TIME_HOUR_MS,
	RELATIVE_TIME_MINUTE_MS,
	UNTITLED_SESSION_TITLE,
} from "@/constants/sessions";
import type { SessionRow } from "@/session/useSessions";

/**
 * Pure helpers for the home page's recents: title fallback, last path segment,
 * day grouping, and relative time. Split out so they are unit-testable without a
 * server or a DOM.
 */

export function sessionTitle(session: SessionRow): string {
	const title = session.title?.trim();
	return title === undefined || title === "" ? UNTITLED_SESSION_TITLE : title;
}

export function lastPathSegment(directory: string): string {
	const parts = directory.split(/[\\/]/).filter((part) => part !== "");
	const last = parts.length === 0 ? directory : (parts[parts.length - 1] ?? directory);
	if (last.length <= RECENT_DIRECTORY_MAX_CHARS) return last;
	return `${last.slice(0, RECENT_DIRECTORY_MAX_CHARS - 1)}…`;
}

export type RecentGroup = {
	readonly label: string;
	readonly sessions: readonly SessionRow[];
};

/** Newest-first sessions grouped by the day of `time.updated`. */
export function groupSessionsByDay(
	sessions: readonly SessionRow[],
	nowMs: number = Date.now(),
): RecentGroup[] {
	const groups = new Map<string, SessionRow[]>();
	for (const session of sessions) {
		const day = new Date(session.time.updated).toDateString();
		const label = isToday(session.time.updated, nowMs) ? "Today" : day;
		const bucket = groups.get(label);
		if (bucket === undefined) groups.set(label, [session]);
		else bucket.push(session);
	}
	return [...groups.entries()].map(([label, rows]) => ({ label, sessions: rows }));
}

function isToday(updatedMs: number, nowMs: number): boolean {
	return new Date(updatedMs).toDateString() === new Date(nowMs).toDateString();
}

export function relativeTime(updatedMs: number, nowMs: number = Date.now()): string {
	const diff = Math.max(0, nowMs - updatedMs);
	if (diff < RELATIVE_TIME_MINUTE_MS) return "just now";
	if (diff < RELATIVE_TIME_HOUR_MS) {
		return `${Math.floor(diff / RELATIVE_TIME_MINUTE_MS)}m ago`;
	}
	if (diff < RELATIVE_TIME_DAY_MS) {
		return `${Math.floor(diff / RELATIVE_TIME_HOUR_MS)}h ago`;
	}
	return `${Math.floor(diff / RELATIVE_TIME_DAY_MS)}d ago`;
}

export function agentModel(session: SessionRow): string | null {
	const agent = session.agent;
	const model = session.model;
	if (agent === undefined && model === undefined) return null;
	if (agent !== undefined && model !== undefined) return `${agent}·${model.id}`;
	if (agent !== undefined) return String(agent);
	return model !== undefined ? model.id : null;
}

export function sessionDayLabel(updatedMs: number, nowMs: number = Date.now()): string {
	return isToday(updatedMs, nowMs) ? "Today" : new Date(updatedMs).toDateString();
}

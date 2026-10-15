import { lastPathSegment, sessionTitle } from "@/pages/homeModel";
import type { SessionRow } from "@/session/useSessions";

/**
 * The picker's pure search model (spec 010 §Top nav: the picker searches *all
 * root sessions*): filter by title **and** the directory text a row renders,
 * and split one text into emphasised and plain segments so a row can mark the
 * match.
 *
 * No DOM and no colour — the row decides how a matched segment is styled. The
 * match is a substring, not fuzzy: a picker over tens of rows wants to be told
 * *why* a row matched, and a substring is the reason text can show.
 */

/** One run of text: `match` marks the part the query hit, `at` its offset. */
export type TextSegment = {
	readonly text: string;
	readonly match: boolean;
	/** The segment's start offset in the original text — a stable render key. */
	readonly at: number;
};

/** The case-insensitive needle, or `""` when the query is blank. */
function needle(query: string): string {
	return query.trim().toLowerCase();
}

/**
 * What a row is searched by: its title and **the directory text the row
 * renders** (the last path segment only). Searching the full path would keep a
 * row whose match is in a segment the row never shows — kept, and highlighted
 * nowhere.
 */
function haystack(session: SessionRow): string {
	return `${sessionTitle(session)}\n${lastPathSegment(session.location.directory)}`.toLowerCase();
}

/** Whether one session matches `query`; a blank query matches everything. */
export function sessionMatches(session: SessionRow, query: string): boolean {
	const term = needle(query);
	return term === "" || haystack(session).includes(term);
}

/** The loaded rows a query keeps, in the order they arrived (newest first). */
export function filterSessions(sessions: readonly SessionRow[], query: string): SessionRow[] {
	const term = needle(query);
	if (term === "") return [...sessions];
	return sessions.filter((session) => haystack(session).includes(term));
}

/** Split `text` at every occurrence of `query`, marking the matches. */
export function emphasize(text: string, query: string): TextSegment[] {
	const term = needle(query);
	if (term === "") return [{ text, match: false, at: 0 }];
	const hay = text.toLowerCase();
	const segments: TextSegment[] = [];
	let from = 0;
	for (;;) {
		const at = hay.indexOf(term, from);
		if (at === -1) break;
		if (at > from) segments.push({ text: text.slice(from, at), match: false, at: from });
		segments.push({ text: text.slice(at, at + term.length), match: true, at });
		from = at + term.length;
	}
	if (from < text.length) segments.push({ text: text.slice(from), match: false, at: from });
	return segments.length === 0 ? [{ text, match: false, at: 0 }] : segments;
}

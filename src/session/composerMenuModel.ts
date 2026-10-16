import { COMPOSER_MENTION_PREFIX, COMPOSER_SLASH_PREFIX } from "@/constants/composer";
import type { ComposerEntry } from "@/session/composerEntries";
import type { ComposerMention } from "@/session/promptTypes";

/**
 * The composer menu's **arithmetic** (spec 020 §Prompt box, M2.5): the token the menu
 * answers to, the filter, the non-wrapping movement, and what accepting a row does to
 * the text. The entries themselves are `composerEntries.ts`.
 *
 * Everything here is pure, so the rules the row names — ↑/↓ without wrapping, Esc
 * closing only the menu, a server command inserting `/<name> ` and sending nothing —
 * are testable without a DOM or a client.
 */

/** The token before the caret: its trigger, its query and where the trigger starts. */
export type MenuToken = {
	readonly trigger: typeof COMPOSER_SLASH_PREFIX | typeof COMPOSER_MENTION_PREFIX;
	readonly query: string;
	readonly start: number;
	readonly end: number;
};

/**
 * The token the menu answers to, or `null`. A token starts at a `/` or `@` that
 * begins a word (`^` or whitespace before it) and runs to the caret with no
 * whitespace inside — so a `/` in the middle of a path never opens the menu.
 */
export function menuToken(text: string, caret: number): MenuToken | null {
	const at = Math.max(0, Math.min(caret, text.length));
	let start = at;
	while (start > 0 && !/\s/.test(text[start - 1] as string)) start--;
	const trigger = text[start];
	if (trigger !== COMPOSER_SLASH_PREFIX && trigger !== COMPOSER_MENTION_PREFIX) return null;
	return { trigger, query: text.slice(start + 1, at), start, end: at };
}

/** Filter, keeping the order the sources gave: a prefix match ranks above a substring. */
export function filterComposerEntries(
	entries: readonly ComposerEntry[],
	query: string,
): ComposerEntry[] {
	const term = query.trim().toLowerCase();
	if (term === "") return [...entries];
	const prefix: ComposerEntry[] = [];
	const inner: ComposerEntry[] = [];
	for (const entry of entries) {
		const haystack = `${entry.label}\n${entry.detail}`.toLowerCase();
		if (entry.label.toLowerCase().startsWith(term)) prefix.push(entry);
		else if (haystack.includes(term)) inner.push(entry);
	}
	return [...prefix, ...inner];
}

/** Move by `delta` and **clamp** at both ends: no wrap, so the list cannot cycle. */
export function moveIndex(index: number, count: number, delta: number): number {
	if (count <= 0) return 0;
	return Math.max(0, Math.min(index + delta, count - 1));
}

/**
 * What accepting a row does to the text — pure, so the insert and the two different
 * meanings of "accept" are testable without a DOM or a client:
 *
 * - a **server command** or a **mention** replaces its token with `insert` and, for a
 *   mention, reports the span the payload will carry;
 * - a **client command** deletes the typed token and runs in the app, inserting
 *   nothing and becoming no prompt.
 */
export type EntryEffect = {
	readonly text: string;
	readonly caret: number;
	readonly mention: ComposerMention | null;
	readonly runClientCommand: string | null;
};

export function entryEffect(text: string, token: MenuToken, entry: ComposerEntry): EntryEffect {
	if (entry.clientCommand !== undefined) {
		return {
			text: text.slice(0, token.start) + text.slice(token.end),
			caret: token.start,
			mention: null,
			runClientCommand: entry.clientCommand,
		};
	}
	if (entry.insert === null)
		return { text, caret: token.end, mention: null, runClientCommand: null };
	const body = entry.insert.trimEnd();
	const mention =
		entry.mention === undefined
			? null
			: {
					...entry.mention,
					start: token.start,
					end: token.start + body.length,
					text: body,
				};
	return {
		text: text.slice(0, token.start) + entry.insert + text.slice(token.end),
		caret: token.start + entry.insert.length,
		mention,
		runClientCommand: null,
	};
}

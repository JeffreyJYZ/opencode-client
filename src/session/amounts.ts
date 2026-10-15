import type { TokenUsageInfo } from "@opencode/client";
import {
	STATUSLINE_SPEND_PREFIX,
	TOKEN_COMPACT_DECIMALS,
	TOKEN_COMPACT_UNIT,
} from "@/constants/statusline";
import { COST_DECIMALS } from "@/constants/transcriptUi";

/**
 * How the sidebar and the statusline show a number a **server** produced
 * (spec 020 §Sidebar, §Statusline). Nothing here derives a figure from the
 * stream: `totalTokens` adds the server's own four fields, `formatTokens` and
 * `formatSpend` only choose a notation, so the figure shown is the figure read.
 */

/** The session's own token total: the server's fields, summed as shown. */
export function totalTokens(tokens: TokenUsageInfo): number {
	return tokens.input + tokens.output + tokens.reasoning + tokens.cache.read + tokens.cache.write;
}

/** `1 234` → `1.2k`; below the unit the exact figure is kept. */
export function formatTokens(value: number): string {
	if (value < TOKEN_COMPACT_UNIT) return String(value);
	return `${(value / TOKEN_COMPACT_UNIT).toFixed(TOKEN_COMPACT_DECIMALS)}k`;
}

/** The cost, with the footer's own decimals so a figure reads the same anywhere. */
export function formatSpend(value: number): string {
	return `${STATUSLINE_SPEND_PREFIX}${value.toFixed(COST_DECIMALS)}`;
}

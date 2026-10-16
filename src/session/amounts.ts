import type { TokenUsageInfo } from "@opencode/client";
import {
	STATUSLINE_SPEND_PREFIX,
	TOKEN_COMPACT_BILLION_UNIT,
	TOKEN_COMPACT_DECIMALS,
	TOKEN_COMPACT_MILLION_UNIT,
	TOKEN_COMPACT_SUFFIX_G,
	TOKEN_COMPACT_SUFFIX_K,
	TOKEN_COMPACT_SUFFIX_M,
	TOKEN_COMPACT_UNIT,
} from "@/constants/statusline";
import { COST_DECIMALS, SPEND_MIN_DECIMALS } from "@/constants/transcriptUi";

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

/** `1 234` → `1.2k`, `592 256 700` → `592.3M`; below the unit the exact figure. */
export function formatTokens(value: number): string {
	if (value < TOKEN_COMPACT_UNIT) return String(value);
	if (value < TOKEN_COMPACT_MILLION_UNIT)
		return `${(value / TOKEN_COMPACT_UNIT).toFixed(TOKEN_COMPACT_DECIMALS)}${TOKEN_COMPACT_SUFFIX_K}`;
	if (value < TOKEN_COMPACT_BILLION_UNIT)
		return `${(value / TOKEN_COMPACT_MILLION_UNIT).toFixed(TOKEN_COMPACT_DECIMALS)}${TOKEN_COMPACT_SUFFIX_M}`;
	return `${(value / TOKEN_COMPACT_BILLION_UNIT).toFixed(TOKEN_COMPACT_DECIMALS)}${TOKEN_COMPACT_SUFFIX_G}`;
}

/**
 * The cost, rounded to at most `COST_DECIMALS` with trailing zeros trimmed —
 * `$5.6840` → `$5.68`, `$0.0000` → `$0` — while a nonzero figure keeps at
 * least `SPEND_MIN_DECIMALS`, so cents are never trimmed away.
 */
export function formatSpend(value: number): string {
	const fixed = value.toFixed(COST_DECIMALS);
	if (/^0(\.0+)?$/.test(fixed)) return `${STATUSLINE_SPEND_PREFIX}0`;
	const trimmed = fixed.replace(/(\.\d*?)0+$/, "$1");
	const fraction = trimmed.split(".").at(1) ?? "";
	if (fraction.length < SPEND_MIN_DECIMALS)
		return `${STATUSLINE_SPEND_PREFIX}${Number(fixed).toFixed(SPEND_MIN_DECIMALS)}`;
	return `${STATUSLINE_SPEND_PREFIX}${trimmed}`;
}

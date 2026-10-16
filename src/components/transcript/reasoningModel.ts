import {
	DURATION_DAY_MS,
	DURATION_HOUR_MS,
	DURATION_MINUTE_MS,
	DURATION_MS,
	DURATION_PAIR_SEPARATOR,
	DURATION_SECONDS_DECIMALS,
	DURATION_UNIT,
	REASONING_LABEL,
	REASONING_SEPARATOR,
	REASONING_TITLE_SEPARATOR,
} from "@/constants/transcriptUi";
import type { TextRow } from "@/session/transcript";

/**
 * The reasoning group's summary line and its duration (M2.17, spec 020 §Transcript:
 * `+ Thought: <title> · <duration>`). Pure, so the line is asserted without a
 * component and the duration's arithmetic is testable on its own.
 *
 * **The title is the model's own, not an invented one.** A reasoning summary from
 * the Responses-style providers opens with a bolded block — `**Inspecting the
 * parser**\n\n<body>` — and that block is the title the reference shows; a part
 * without one simply has none, and the line falls back to the duration alone. The
 * body is never stripped: expanding shows the row's whole capped payload.
 *
 * **A duration only exists once the part has finished.** It is the measured pair
 * `created` → `endedAt` (the `.started`/`.ended` frames, or a refetched part's own
 * `time`); while a part streams `endedAt` is absent and the summary prints no
 * duration at all, because an invented one is worse than none.
 */

/** The leading bolded block a reasoning summary opens with, or `null`. */
export function reasoningTitle(text: string): string | null {
	const match = text.trim().match(/^\*\*([^*\n]+)\*\*(?:\r?\n\r?\n|$)/);
	return match === null ? null : match[1].trim();
}

/** How long the group ran, or `null` while it is still streaming. */
export function reasoningDuration(row: TextRow): number | null {
	return row.endedAt === undefined ? null : Math.max(0, row.endedAt - row.created);
}

/** Two figures of a compound duration, joined on the shared separator. */
function pair(first: number, a: string, second: number, b: string): string {
	return `${first}${a}${DURATION_PAIR_SEPARATOR}${second}${b}`;
}

/** A duration on the TUI's own scale: `820ms`, `1.2s`, `1m 5s`, `1h 2m`, `1d 2h`. */
export function formatDuration(input: number): string {
	if (input < DURATION_MS) return `${input}${DURATION_UNIT.ms}`;
	if (input < DURATION_MINUTE_MS) {
		return `${(input / DURATION_MS).toFixed(DURATION_SECONDS_DECIMALS)}${DURATION_UNIT.seconds}`;
	}
	if (input < DURATION_HOUR_MS) {
		return pair(
			Math.floor(input / DURATION_MINUTE_MS),
			DURATION_UNIT.minutes,
			Math.floor((input % DURATION_MINUTE_MS) / DURATION_MS),
			DURATION_UNIT.seconds,
		);
	}
	if (input < DURATION_DAY_MS) {
		return pair(
			Math.floor(input / DURATION_HOUR_MS),
			DURATION_UNIT.hours,
			Math.floor((input % DURATION_HOUR_MS) / DURATION_MINUTE_MS),
			DURATION_UNIT.minutes,
		);
	}
	return pair(
		Math.floor(input / DURATION_DAY_MS),
		DURATION_UNIT.days,
		Math.floor((input % DURATION_DAY_MS) / DURATION_HOUR_MS),
		DURATION_UNIT.hours,
	);
}

/**
 * The collapsed group's summary, after the mark: `Thought`, `Thought: <title>`,
 * `Thought: 1.2s`, or `Thought: <title> · 1.2s`.
 */
export function reasoningSummaryText(row: TextRow): string {
	const title = reasoningTitle(row.text.kept);
	const duration = reasoningDuration(row);
	const meta = duration === null ? [] : [formatDuration(duration)];
	if (title === null && meta.length === 0) return REASONING_LABEL;
	const parts = title === null ? meta : [title, ...meta];
	return `${REASONING_LABEL}${REASONING_TITLE_SEPARATOR}${parts.join(REASONING_SEPARATOR)}`;
}

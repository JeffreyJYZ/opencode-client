import {
	PAYLOAD_MAX_CHARS,
	TOOL_INPUT_ELISION,
	TOOL_INPUT_MAX_DEPTH,
} from "@/constants/transcript";

/**
 * **The ingest cap** (spec 050 §Ingest discipline: "Cap every text payload at
 * ingest"). This module is the one named place that decides what is kept: a
 * `tool.success` body and a `shell.ended` output arrive **whole**, and a
 * delta/`ended` pair re-inflates whatever streaming trimmed (api §4), so the cap
 * cannot live in the component that renders the payload.
 *
 * `Payload` carries the count with the text, which is what makes `(N more lines)`
 * the truth: the store's own `dropped` is added to the lines the render cap hides,
 * and the elision marker is drawn, never stored, so it can never be counted as a
 * line of its own.
 *
 * A **line break** is the unit, counted the way `wc -l` counts one: a payload's
 * unterminated last line is not a line. Line-break counts are additive across any
 * split of a string, which is what lets an append stay a scan of the delta.
 */

/** A text payload the ingest kept: the characters that survived, and what was lost. */
export type Payload = {
	readonly kept: string;
	/** Line breaks dropped by the ingest cap — the truth `(N more lines)` starts from. */
	readonly dropped: number;
};

/** A row with no payload yet; shared, because it is immutable. */
export const EMPTY_PAYLOAD: Payload = { kept: "", dropped: 0 };

/**
 * Line breaks in `text` from `from` on — an **index scan**, never a split into
 * arrays (spec 050 §Ingest discipline).
 */
export function lineBreaks(text: string, from = 0): number {
	let count = 0;
	for (let at = from; at < text.length; at += 1) if (text[at] === "\n") count += 1;
	return count;
}

/**
 * The cap. A payload within `PAYLOAD_MAX_CHARS` is kept whole; a longer one keeps
 * its head and counts the line breaks it dropped. Idempotent by construction: the
 * count is derived from the raw text, so re-applying it to the head cannot inflate
 * it.
 */
export function capPayload(raw: string): Payload {
	if (raw.length <= PAYLOAD_MAX_CHARS) return { kept: raw, dropped: 0 };
	const kept = raw.slice(0, PAYLOAD_MAX_CHARS);
	return { kept, dropped: lineBreaks(raw, PAYLOAD_MAX_CHARS) };
}

/**
 * The payload `previous` grown by `delta` (a streamed text delta).
 *
 * A full head stays full, so only the delta can be dropped — and because a
 * line-break count is additive across the append, the earlier `dropped` is carried
 * rather than recomputed. A frame that **replaces** a payload wholesale calls
 * `capPayload` instead, so a re-inflating `.ended` frame recomputes the truth
 * rather than resetting it.
 */
export function growPayload(previous: Payload, delta: string): Payload {
	if (delta === "") return previous;
	if (previous.kept.length >= PAYLOAD_MAX_CHARS) {
		return { kept: previous.kept, dropped: previous.dropped + lineBreaks(delta) };
	}
	return capPayload(previous.kept + delta);
}

/** A payload stored as a plain string (a tool input, a prompt, a notice), capped. */
export function capString(raw: string): string {
	return raw.length <= PAYLOAD_MAX_CHARS ? raw : raw.slice(0, PAYLOAD_MAX_CHARS);
}

/**
 * A tool's input record as the row stores it: a JSON string, with any container
 * below `TOOL_INPUT_MAX_DEPTH` replaced by a marker, then capped (spec 050 §Ingest
 * discipline). Scalars at the limit survive — the depth limit bounds nesting, not
 * data.
 */
export function capInput(input: unknown): string {
	return capString(JSON.stringify(elide(input, TOOL_INPUT_MAX_DEPTH)) ?? "");
}

function elide(input: unknown, depth: number): unknown {
	if (Array.isArray(input)) {
		return depth <= 0 ? TOOL_INPUT_ELISION : input.map((entry) => elide(entry, depth - 1));
	}
	if (isRecord(input)) {
		if (depth <= 0) return TOOL_INPUT_ELISION;
		const record: Record<string, unknown> = {};
		for (const [key, entry] of Object.entries(input)) record[key] = elide(entry, depth - 1);
		return record;
	}
	return input;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

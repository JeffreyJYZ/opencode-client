import { describe, expect, test } from "bun:test";
import {
	PAYLOAD_ELISION,
	PAYLOAD_MAX_CHARS,
	TOOL_INPUT_ELISION,
	TOOL_INPUT_MAX_DEPTH,
} from "@/constants/transcript";
import {
	capInput,
	capPayload,
	capString,
	EMPTY_PAYLOAD,
	growPayload,
	lineBreaks,
} from "@/session/payloadCaps";

/**
 * The ingest cap, unit by unit (M2.4). Everything here is a **shape the measured
 * system produces**: a `tool.success` body and a `shell.ended` output arrive whole
 * (api §4), and a text payload arrives as deltas that an `.ended` re-inflates.
 * A payload's lines are terminated here on purpose — that is what `wc -l` counts,
 * and the count the reader sees is the same one.
 */

/** `count` terminated lines: exactly `count` line breaks. */
function manyLines(count: number): string {
	return "line\n".repeat(count);
}

/** The head every over-cap payload keeps. */
function head(): string {
	return "x".repeat(PAYLOAD_MAX_CHARS);
}

describe("capPayload", () => {
	test("a payload within the cap is kept whole and drops nothing", () => {
		const raw = manyLines(10);
		expect(capPayload(raw)).toEqual({ kept: raw, dropped: 0 });
	});

	test("a payload over the cap keeps the head and counts the line breaks it dropped", () => {
		const raw = `${head()}${manyLines(7)}`;
		const capped = capPayload(raw);
		expect(capped.kept).toBe(raw.slice(0, PAYLOAD_MAX_CHARS));
		expect(capped.kept).toHaveLength(PAYLOAD_MAX_CHARS);
		expect(capped.dropped).toBe(7);
		expect(capped.dropped).toBe(lineBreaks(raw) - lineBreaks(capped.kept));
	});

	test("the count is a line-break count — the reader's `wc -l`", () => {
		expect(lineBreaks("no break here")).toBe(0);
		expect(lineBreaks("one\ntwo")).toBe(1);
		expect(lineBreaks("one\ntwo\n")).toBe(2);
		expect(lineBreaks("a\nb\nc", 2)).toBe(1);
	});

	test("an elision row is drawn, never stored, so it is never a counted line", () => {
		const capped = capPayload(`${head()}${manyLines(2)}`);
		expect(capped.kept).not.toContain(PAYLOAD_ELISION);
		expect(capped.dropped).toBe(2);
	});

	test("re-capping the head cannot inflate the count (idempotent)", () => {
		const once = capPayload(`${head()}${manyLines(4)}`);
		expect(capPayload(once.kept)).toEqual({ kept: once.kept, dropped: 0 });
	});
});

describe("growPayload", () => {
	test("a full head stays full and only the delta can be dropped", () => {
		const full = capPayload(head());
		const grown = growPayload(full, manyLines(3));
		expect(grown.kept).toBe(full.kept);
		expect(grown.dropped).toBe(3);
	});

	test("a head that still fits is capped as one text, not as an accumulation", () => {
		expect(growPayload(capPayload("one\n"), "two\n")).toEqual({
			kept: "one\ntwo\n",
			dropped: 0,
		});
	});

	test("an empty delta returns the payload itself", () => {
		const payload = capPayload("kept\n");
		expect(growPayload(payload, "")).toBe(payload);
	});

	test("a delta that crosses the cap mid-line keeps the head and counts the breaks", () => {
		const grown = growPayload(capPayload(head()), "one\ntwo\n");
		expect(grown.kept).toHaveLength(PAYLOAD_MAX_CHARS);
		expect(grown.dropped).toBe(2);
	});
});

describe("capInput", () => {
	test("keeps a shallow record whole — the anchor and the subagent fields survive", () => {
		const input = { path: "src/a.ts", description: "Wire the rows", n: 1 };
		expect(JSON.parse(capInput(input))).toEqual(input);
	});

	test("elides a container below the depth limit and keeps the scalars above it", () => {
		let deep: Record<string, unknown> = { leaf: "unreachable" };
		for (let at = 0; at < TOOL_INPUT_MAX_DEPTH + 3; at += 1) deep = { down: deep };
		deep.top = "kept";
		const parsed = JSON.parse(capInput(deep)) as Record<string, unknown>;
		expect(parsed.top).toBe("kept");
		expect(capInput(deep)).toContain(TOOL_INPUT_ELISION);
	});

	test("caps the record's characters too", () => {
		const wide = { path: "src/a.ts", blob: "x".repeat(PAYLOAD_MAX_CHARS + 10) };
		expect(capInput(wide)).toHaveLength(PAYLOAD_MAX_CHARS);
	});
});

describe("capString", () => {
	test("keeps a short payload by identity and cuts a long one at the cap", () => {
		expect(capString("short")).toBe("short");
		expect(capString("x".repeat(PAYLOAD_MAX_CHARS + 10))).toHaveLength(PAYLOAD_MAX_CHARS);
	});

	test("the empty payload is empty", () => {
		expect(EMPTY_PAYLOAD).toEqual({ kept: "", dropped: 0 });
	});
});

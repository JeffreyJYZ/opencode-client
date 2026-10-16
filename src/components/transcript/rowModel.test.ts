import { describe, expect, test } from "bun:test";
import { durationLabel, footerText, rateLabel } from "@/components/transcript/rowModel";
import { ROW_KIND } from "@/constants/transcript";
import {
	FOOTER_DURATION_UNIT,
	FOOTER_RATE_GAP,
	FOOTER_RATE_UNIT,
	FOOTER_SEPARATOR,
} from "@/constants/transcriptUi";
import type { FooterRow } from "@/session/transcript";

/**
 * The per-prompt footer's pure line (M2.16; spec 020 §Transcript). DOM-less on
 * purpose: the four fields and their formatting are asserted here, and the row
 * component only proves it renders this function's output (`rows.test.tsx`).
 */

const footer = (overrides: Partial<FooterRow> = {}): FooterRow => ({
	id: "msg_a:f",
	created: 1,
	seq: 5,
	kind: ROW_KIND.footer,
	agent: "build",
	model: { id: "cat-jam-free", providerID: "opencode" },
	durationMs: 2000,
	outputTokens: 30,
	...overrides,
});

describe("the per-prompt footer's line", () => {
	test("prints the step's own agent, model, duration and rate", () => {
		expect(footerText(footer())).toBe(
			[
				"build",
				"opencode/cat-jam-free",
				`2.0${FOOTER_DURATION_UNIT}`,
				`15.0${FOOTER_RATE_GAP}${FOOTER_RATE_UNIT}`,
			].join(FOOTER_SEPARATOR),
		);
	});

	test("the rate is the step's own output tokens over its own span", () => {
		expect(durationLabel(2000)).toBe(`2.0${FOOTER_DURATION_UNIT}`);
		expect(rateLabel(30, 2000)).toBe(`15.0${FOOTER_RATE_GAP}${FOOTER_RATE_UNIT}`);
		// Doubling the tokens for the same span doubles the rate.
		expect(rateLabel(60, 2000)).toBe(`30.0${FOOTER_RATE_GAP}${FOOTER_RATE_UNIT}`);
	});

	test("a field the step did not carry is left off, never invented", () => {
		// A failed step's payload carries no tokens, so there is no rate to print.
		expect(footerText(footer({ outputTokens: undefined }))).toBe(
			["build", "opencode/cat-jam-free", `2.0${FOOTER_DURATION_UNIT}`].join(FOOTER_SEPARATOR),
		);
		// No span means no duration and no rate.
		expect(footerText(footer({ durationMs: undefined }))).toBe(
			["build", "opencode/cat-jam-free"].join(FOOTER_SEPARATOR),
		);
	});
});

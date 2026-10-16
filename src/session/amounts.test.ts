import { describe, expect, test } from "bun:test";
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
import { formatSpend, formatTokens } from "@/session/amounts";

/** M2.28: the compact ladder and the trimmed spend, pinned at the seam. */

const BELOW_UNIT = TOKEN_COMPACT_UNIT - 1;
const THOUSANDS = 1234;
const MILLIONS_CASE = 592_256_700;
const BILLIONS_CASE = 2_500_000_000;

describe("formatTokens", () => {
	test("keeps the exact figure below the unit", () => {
		expect(formatTokens(BELOW_UNIT)).toBe(String(BELOW_UNIT));
	});
	test("compacts thousands with k", () => {
		const expected = `${(THOUSANDS / TOKEN_COMPACT_UNIT).toFixed(TOKEN_COMPACT_DECIMALS)}${TOKEN_COMPACT_SUFFIX_K}`;
		expect(formatTokens(THOUSANDS)).toBe(expected);
	});
	test("compacts millions with M", () => {
		const expected = `${(MILLIONS_CASE / TOKEN_COMPACT_MILLION_UNIT).toFixed(TOKEN_COMPACT_DECIMALS)}${TOKEN_COMPACT_SUFFIX_M}`;
		expect(formatTokens(MILLIONS_CASE)).toBe(expected);
	});
	test("compacts billions with G", () => {
		const expected = `${(BILLIONS_CASE / TOKEN_COMPACT_BILLION_UNIT).toFixed(TOKEN_COMPACT_DECIMALS)}${TOKEN_COMPACT_SUFFIX_G}`;
		expect(formatTokens(BILLIONS_CASE)).toBe(expected);
	});
});

const CHARGE = 5.68;
const ZERO_SPEND = 0;
const CENTS_SPEND = 3.32;
const SUBCENT_SPEND = 0.0001;
const WHOLE_SPEND = 5;

describe("formatSpend", () => {
	test("trims trailing zeros past cents", () => {
		expect(formatSpend(CHARGE)).toBe(
			`${STATUSLINE_SPEND_PREFIX}${CHARGE.toFixed(SPEND_MIN_DECIMALS)}`,
		);
	});
	test("renders an exact zero bare", () => {
		expect(formatSpend(ZERO_SPEND)).toBe(`${STATUSLINE_SPEND_PREFIX}0`);
	});
	test("keeps a real charge's cents", () => {
		expect(formatSpend(CENTS_SPEND)).toBe(
			`${STATUSLINE_SPEND_PREFIX}${CENTS_SPEND.toFixed(SPEND_MIN_DECIMALS)}`,
		);
	});
	test("keeps sub-cent precision to the shared max", () => {
		expect(formatSpend(SUBCENT_SPEND)).toBe(
			`${STATUSLINE_SPEND_PREFIX}${SUBCENT_SPEND.toFixed(COST_DECIMALS)}`,
		);
	});
	test("pads a whole figure to cents", () => {
		expect(formatSpend(WHOLE_SPEND)).toBe(
			`${STATUSLINE_SPEND_PREFIX}${WHOLE_SPEND.toFixed(SPEND_MIN_DECIMALS)}`,
		);
	});
});

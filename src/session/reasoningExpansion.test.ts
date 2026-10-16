import { afterEach, describe, expect, test } from "bun:test";
import { REASONING_EXPANSION_MEMORY } from "@/constants/transcript";
import {
	isReasoningExpanded,
	resetReasoningExpansion,
	setReasoningExpanded,
} from "@/session/reasoningExpansion";

/**
 * The expansion memory itself (M2.17): it remembers an open group, forgets a closed
 * one, and is bounded so a long session's parts cannot grow it without end.
 */

afterEach(resetReasoningExpansion);

describe("the reasoning expansion memory", () => {
	test("remembers an open group and forgets a closed one", () => {
		expect(isReasoningExpanded("msg_a:r0")).toBe(false);
		setReasoningExpanded("msg_a:r0", true);
		expect(isReasoningExpanded("msg_a:r0")).toBe(true);
		setReasoningExpanded("msg_a:r0", false);
		expect(isReasoningExpanded("msg_a:r0")).toBe(false);
	});

	test("is bounded, dropping the oldest group first", () => {
		for (let i = 0; i <= REASONING_EXPANSION_MEMORY; i++) {
			setReasoningExpanded(`msg_${i}:r0`, true);
		}
		expect(isReasoningExpanded("msg_0:r0")).toBe(false);
		expect(isReasoningExpanded(`msg_${REASONING_EXPANSION_MEMORY}:r0`)).toBe(true);
	});
});

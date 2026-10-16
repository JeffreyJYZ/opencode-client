import { describe, expect, test } from "bun:test";
import { atTail, tailDistance, tailTop, viewportOf } from "@/components/transcript/tailFollow";
import { TAIL_THRESHOLD_PX } from "@/constants/scroll";

/** The arithmetic the hook is built on, with no DOM in it (M2.9). */

const viewport = (scrollTop: number, scrollHeight = 400, clientHeight = 100) => ({
	scrollTop,
	scrollHeight,
	clientHeight,
});

describe("tailDistance", () => {
	test("measures the pixels between the viewport and the tail", () => {
		expect(tailDistance(viewport(300))).toBe(0);
		expect(tailDistance(viewport(200))).toBe(100);
		expect(tailDistance(viewport(0))).toBe(300);
	});

	test("is never negative, even if a layout says it should be", () => {
		expect(tailDistance(viewport(500))).toBe(0);
	});
});

describe("atTail", () => {
	test("is true at the tail and within the threshold of it", () => {
		expect(atTail(viewport(300))).toBe(true);
		expect(atTail(viewport(300 - TAIL_THRESHOLD_PX))).toBe(true);
	});

	test("is false once the reader is past the threshold", () => {
		expect(atTail(viewport(300 - TAIL_THRESHOLD_PX - 1))).toBe(false);
	});
});

describe("tailTop", () => {
	test("is the scrollTop that puts the viewport on the tail", () => {
		expect(tailTop(viewport(0))).toBe(300);
		expect(tailTop(viewport(0, 50, 100))).toBe(0);
	});
});

describe("viewportOf", () => {
	test("reads the three numbers off an element", () => {
		const element = { scrollTop: 12, scrollHeight: 400, clientHeight: 100 };
		expect(viewportOf(element as unknown as Element & typeof element)).toEqual(element);
	});
});

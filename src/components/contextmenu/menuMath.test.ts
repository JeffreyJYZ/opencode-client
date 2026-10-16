import { describe, expect, test } from "bun:test";
import {
	elementPoint,
	placeMenu,
	pointerPoint,
	stepIndex,
} from "@/components/contextmenu/menuMath";
import { MENU_EDGE_GUTTER_PX } from "@/constants/menu";

/**
 * The primitive's arithmetic (M5.1 requirement 1, 6): the clamp at a viewport edge
 * and the no-wrap item step are the two rules worth a test, and both are functions
 * over numbers, so they are asserted without a DOM — the DOM tests cannot lay out a
 * box, and a placement rule proved only under happy-dom's zero-height layout would
 * be a rule about happy-dom.
 */

const VIEWPORT = { width: 800, height: 600 };
const SIZE = { width: 100, height: 80 };

describe("placeMenu", () => {
	test("a panel that fits sits at the pointer", () => {
		expect(placeMenu({ x: 50, y: 60 }, SIZE, VIEWPORT, MENU_EDGE_GUTTER_PX)).toEqual({
			x: 50,
			y: 60,
		});
	});

	test("at the bottom-right it flips back by its own overflow, not to the gutter", () => {
		// 800 - 100 - 8 = 692 and 600 - 80 - 8 = 512: the panel's far edge lands on
		// the gutter, and the pointer stays the anchor.
		expect(placeMenu({ x: 790, y: 590 }, SIZE, VIEWPORT, MENU_EDGE_GUTTER_PX)).toEqual({
			x: 692,
			y: 512,
		});
	});

	test("a point outside the viewport clamps to the gutter", () => {
		expect(placeMenu({ x: -5, y: -5 }, SIZE, VIEWPORT, MENU_EDGE_GUTTER_PX)).toEqual({
			x: MENU_EDGE_GUTTER_PX,
			y: MENU_EDGE_GUTTER_PX,
		});
	});

	test("a panel larger than the viewport still starts at the gutter", () => {
		const huge = { width: 900, height: 700 };
		expect(placeMenu({ x: 100, y: 100 }, huge, VIEWPORT, MENU_EDGE_GUTTER_PX)).toEqual({
			x: MENU_EDGE_GUTTER_PX,
			y: MENU_EDGE_GUTTER_PX,
		});
	});
});

describe("the menu's two source points", () => {
	test("the pointer is its own point", () => {
		expect(pointerPoint({ clientX: 3, clientY: 4 })).toEqual({ x: 3, y: 4 });
	});

	test("the keyboard anchors under the element", () => {
		expect(elementPoint({ left: 10, bottom: 20 })).toEqual({ x: 10, y: 20 });
	});
});

describe("stepIndex", () => {
	test("a step moves one item and never wraps", () => {
		expect(stepIndex(0, 3, 1)).toBe(1);
		expect(stepIndex(2, 3, 1)).toBe(2);
		expect(stepIndex(0, 3, -1)).toBe(0);
		expect(stepIndex(1, 3, -1)).toBe(0);
	});

	test("an empty menu has nowhere to step", () => {
		expect(stepIndex(0, 0, 1)).toBe(0);
	});
});

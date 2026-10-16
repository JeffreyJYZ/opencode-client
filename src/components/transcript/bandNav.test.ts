import { describe, expect, test } from "bun:test";
import {
	bandDirectionFor,
	bandOffsets,
	bandTarget,
	installBandKeys,
	userBandIds,
} from "@/components/transcript/bandNav";
import { KEY_MODIFIER_ALT_GLYPH, matchesBinding } from "@/constants/chords";
import { SHORTCUT_BAND_NEXT, SHORTCUT_BAND_PREVIOUS } from "@/constants/keys";
import { BAND_DIRECTION } from "@/constants/scroll";
import { ROW_KIND } from "@/constants/transcript";
import { ROW_ID_ATTR } from "@/constants/transcriptUi";
import { textRow, toolRow, userRow } from "@/test/transcriptRows";

/**
 * Band navigation (M2.23, spec 020 §Scroll). The search itself is proved on
 * **offsets**, with no DOM: the installer's job is only to read them off a real
 * container, which the last test does with a hand-set layout, since happy-dom has
 * none.
 */

/** A keydown with the modifiers a band chord does (or does not) name. */
function press(key: string, altKey: boolean, metaKey = false): KeyboardEvent {
	return new KeyboardEvent("keydown", { key, altKey, metaKey, bubbles: true, cancelable: true });
}

describe("the band chords", () => {
	test("⌥↑ and ⌥↓ name their own directions and nothing else", () => {
		expect(bandDirectionFor(press("ArrowUp", true))).toBe(BAND_DIRECTION.previous);
		expect(bandDirectionFor(press("ArrowDown", true))).toBe(BAND_DIRECTION.next);
		// Option alone is the whole chord: a bare arrow, or one holding ⌘, is not it.
		expect(bandDirectionFor(press("ArrowUp", false))).toBeNull();
		expect(bandDirectionFor(press("ArrowDown", false))).toBeNull();
		expect(bandDirectionFor(press("ArrowUp", true, true))).toBeNull();
		expect(bandDirectionFor(press("ArrowDown", true, true))).toBeNull();
		// And the two rows never shadow each other, nor the ⌘⌥ composite.
		expect(matchesBinding(press("ArrowUp", true), SHORTCUT_BAND_NEXT)).toBe(false);
		expect(matchesBinding(press("ArrowDown", true), SHORTCUT_BAND_PREVIOUS)).toBe(false);
		expect(matchesBinding(press("ArrowUp", true, true), SHORTCUT_BAND_PREVIOUS)).toBe(false);
	});

	test("the labels are composed from the Option glyph, never typed", () => {
		expect(SHORTCUT_BAND_PREVIOUS.label).toBe(`${KEY_MODIFIER_ALT_GLYPH}↑`);
		expect(SHORTCUT_BAND_NEXT.label).toBe(`${KEY_MODIFIER_ALT_GLYPH}↓`);
	});
});

describe("the band search", () => {
	/** Four bands, at the offsets a layout would give them. */
	const bands = [0, 320, 640, 1280];

	test("a press lands on the band above and the band below", () => {
		expect(bandTarget(bands, 640, BAND_DIRECTION.previous)).toBe(320);
		expect(bandTarget(bands, 640, BAND_DIRECTION.next)).toBe(1280);
		// From between two bands, the nearest one in that direction.
		expect(bandTarget(bands, 500, BAND_DIRECTION.previous)).toBe(320);
		expect(bandTarget(bands, 500, BAND_DIRECTION.next)).toBe(640);
		// A press lands *on* a band, so the next one moves on from it.
		expect(bandTarget(bands, 320, BAND_DIRECTION.next)).toBe(640);
	});

	test("at the first band ⌥↑ does nothing and at the last ⌥↓ does nothing", () => {
		expect(bandTarget(bands, 0, BAND_DIRECTION.previous)).toBeNull();
		expect(bandTarget(bands, 1280, BAND_DIRECTION.next)).toBeNull();
		// Never a fallback to the top or the bottom: the other direction still moves.
		expect(bandTarget(bands, 1280, BAND_DIRECTION.previous)).toBe(640);
		expect(bandTarget(bands, 0, BAND_DIRECTION.next)).toBe(320);
		// A transcript with no band at all is inert in both directions.
		expect(bandTarget([], 400, BAND_DIRECTION.previous)).toBeNull();
		expect(bandTarget([], 400, BAND_DIRECTION.next)).toBeNull();
	});

	test("only the store's user rows are bands", () => {
		const rows = [
			userRow(),
			textRow(ROW_KIND.prose, "p1"),
			toolRow(),
			{ ...userRow(), id: "u2" },
		];
		expect(userBandIds(rows)).toEqual(["u1", "u2"]);
	});
});

describe("a press through the installer", () => {
	test("moves the container to the band above and the band below", () => {
		const scroller = document.createElement("main");
		let top = 1000;
		// happy-dom has no layout, so the container's own scroll position and the two
		// rects are set to the numbers a real layout would have produced.
		Object.defineProperty(scroller, "scrollTop", {
			get: () => top,
			set: (value: number) => {
				top = value;
			},
			configurable: true,
		});
		Object.defineProperty(scroller, "getBoundingClientRect", { value: () => ({ top: 0 }) });
		// A row's rect moves with the scroll position while its *content* offset does
		// not: the two bands sit at 800 and 1300 in the container's own coordinates.
		for (const [index, offset] of [800, 1300].entries()) {
			const node = document.createElement("article");
			node.setAttribute(ROW_ID_ATTR, `band_${index}`);
			Object.defineProperty(node, "getBoundingClientRect", {
				value: () => ({ top: offset - top }),
			});
			scroller.append(node);
		}
		// The reader is at 1000, between the two bands.
		const bandIds = ["band_0", "band_1"];
		expect(bandOffsets(scroller, bandIds)).toEqual([800, 1300]);
		const uninstall = installBandKeys(() => ({ scroller, bandIds }), {
			scrollTo: (offset) => {
				scroller.scrollTop = offset;
			},
		});
		window.dispatchEvent(press("ArrowUp", true));
		expect(scroller.scrollTop).toBe(800);
		window.dispatchEvent(press("ArrowDown", true));
		expect(scroller.scrollTop).toBe(1300);
		// At the last band the down chord is inert, so the position does not move.
		window.dispatchEvent(press("ArrowDown", true));
		expect(scroller.scrollTop).toBe(1300);
		uninstall();
		window.dispatchEvent(press("ArrowUp", true));
		expect(scroller.scrollTop).toBe(1300);
	});
});

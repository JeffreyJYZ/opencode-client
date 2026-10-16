import { describe, expect, test } from "bun:test";
import { countRowsBelow } from "@/components/transcript/rowsBelow";
import { ROW_ID_ATTR } from "@/constants/transcriptUi";
import { boxAt } from "@/test/scroll";

/**
 * The pure read the pill's count is built on (M2.22): the scroller's own bottom edge
 * against each rendered row's top. happy-dom has no layout engine, so every box is
 * *set* to what a real layout would have measured, as `src/test/scroll.tsx` does for
 * the scroller itself.
 */

describe("countRowsBelow", () => {
	test("counts the rows past the box's bottom edge, not the one straddling it", () => {
		const box = document.createElement("main");
		for (const id of ["a", "b", "c", "d"]) {
			const row = document.createElement("div");
			row.setAttribute(ROW_ID_ATTR, id);
			box.append(row);
		}
		boxAt(box, 0, 100);
		const rows = [...box.querySelectorAll(`[${ROW_ID_ATTR}]`)];
		boxAt(rows[0], -50, 30);
		boxAt(rows[1], 20, 30);
		// `c` straddles the edge: its top is above the fold, so it is visible.
		boxAt(rows[2], 90, 40);
		boxAt(rows[3], 140, 30);

		expect(countRowsBelow(box)).toBe(1);
	});
});

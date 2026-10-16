import { ROW_ID_ATTR } from "@/constants/transcriptUi";

/**
 * How many rendered rows sit below the fold (M2.22) — the number the jump-to-latest
 * pill states (spec 020 §Scroll: "a count of rows below").
 *
 * **A read of the DOM, never an estimate**: the scroller's own bottom edge against
 * each row's top. Rows are in document order and the transcript stacks them in that
 * order, so the first row whose top has passed the bottom edge is the first one the
 * reader cannot see, and every row after it is below the fold too. The walk stops
 * there, so it reads only the rows still in view — a transcript of thousands of rows
 * costs what one of ten does.
 *
 * A row that is only partly in view is **not** counted: it is visible. The pill is
 * outside the scroller and carries no row id, so it can never count itself.
 */
export function countRowsBelow(node: HTMLElement): number {
	const bottom = node.getBoundingClientRect().bottom;
	const rows = node.querySelectorAll(`[${ROW_ID_ATTR}]`);
	for (let index = 0; index < rows.length; index += 1) {
		if (rows[index].getBoundingClientRect().top >= bottom) return rows.length - index;
	}
	return 0;
}

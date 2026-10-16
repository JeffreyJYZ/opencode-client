import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
	JUMP_LATEST_ATTR,
	JUMP_LATEST_COUNT_PREFIX,
	JUMP_LATEST_COUNT_SUFFIX,
	JUMP_LATEST_LABEL,
} from "@/constants/scroll";
import { ROW_ID_ATTR } from "@/constants/transcriptUi";
import { boxAt, layout, memory, TailHarness } from "@/test/scroll";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);

/**
 * The pill's count (M2.22): spec 020 §Scroll requires the jump-to-latest pill to
 * state "a count of rows below", and that count is a **read of the DOM** — the
 * scroller's own bottom edge against each rendered row's top — not a number the
 * store carries. `rowsBelow.test.ts` proves the read; this proves the pill shows it.
 */

/** Stack the rows the harness rendered at the box's *current* scroll position. */
function stack(box: HTMLElement, step: number): void {
	const rows = box.querySelectorAll(`[${ROW_ID_ATTR}]`);
	rows.forEach((row, index) => {
		boxAt(row, index * step - box.scrollTop, step);
	});
}

/** The reader's own upward gesture: the box unpins and offers the pill. */
function scrollUp(box: HTMLElement, top: number, step: number): void {
	fireEvent.wheel(box, { deltaY: -120 });
	box.scrollTop = top;
	stack(box, step);
	fireEvent.scroll(box);
}

/** The pill, found by its own attribute — its words carry the count now. */
function pill(): Element | null {
	return document.querySelector(`[${JUMP_LATEST_ATTR}]`);
}

function Rows({ count, step }: { readonly count: number; readonly step: number }) {
	const ids = Array.from({ length: count }, (_unused, index) => `r${index}`);
	return (
		<>
			{ids.map((id) => (
				<div key={id} {...{ [ROW_ID_ATTR]: id }} style={{ height: step }} />
			))}
		</>
	);
}

/** 12 rows of 30 px: 360 px of content in a 100 px box, so the tail is `scrollTop` 260. */
const ROWS = 12;
const STEP = 30;
const CLIENT = 100;

/** A mounted harness whose box is measured the way a real layout would measure it. */
function mounted() {
	const deps = memory();
	const body = <Rows count={ROWS} step={STEP} />;
	const { rerender } = render(<TailHarness tabKey="tab_a" deps={deps} body={body} />);
	const box = screen.getByTestId("box");
	layout(box, ROWS * STEP, CLIENT);
	boxAt(box, 0, CLIENT);
	// A commit *after* the box has a height, so the pin writes the real tail.
	rerender(<TailHarness tabKey="tab_a" deps={deps} body={body} />);
	return { deps, box, rerender };
}

describe("the jump-to-latest pill's count", () => {
	test("states how many rows are below the fold", () => {
		const { box } = mounted();
		// The reader scrolls up to 120: the box's bottom edge sits at content 220, so
		// rows 8..11 (tops 120, 150, 180, 210) are below it — four rows.
		scrollUp(box, 120, STEP);
		expect(pill()?.textContent).toBe(
			`${JUMP_LATEST_LABEL}${JUMP_LATEST_COUNT_PREFIX}4${JUMP_LATEST_COUNT_SUFFIX}`,
		);
	});

	test("is absent at the tail, where nothing is below the fold", () => {
		const { box } = mounted();
		stack(box, STEP);
		expect(box.scrollTop).toBe(ROWS * STEP - CLIENT);
		expect(pill()).toBeNull();
	});

	test("changes when rows arrive while the reader is scrolled up", async () => {
		const { deps, box, rerender } = mounted();
		scrollUp(box, 120, STEP);
		// Two rows land while the reader is still scrolled up: no commit of this
		// component measures for them, so the box's own child list is observed.
		rerender(
			<TailHarness tabKey="tab_a" deps={deps} body={<Rows count={ROWS + 2} step={STEP} />} />,
		);
		stack(box, STEP);
		await act(async () => {});
		expect(pill()?.textContent).toBe(
			`${JUMP_LATEST_LABEL}${JUMP_LATEST_COUNT_PREFIX}6${JUMP_LATEST_COUNT_SUFFIX}`,
		);
	});
});

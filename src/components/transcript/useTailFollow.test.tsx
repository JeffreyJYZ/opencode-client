import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { JUMP_LATEST_LABEL } from "@/constants/scroll";
import { distanceFromTail, followingOf, layout, memory, TailHarness } from "@/test/scroll";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);

/**
 * Tail-follow through the real hook (M2.9), on the fixtures in `src/test/scroll.tsx`.
 * The rule each test states is the row's: a programmatic scroll or a layout shift
 * must not unpin, the reader's own gesture must, jump-to-latest must restore
 * follow, an append must not move the viewport relative to the tail, and two tabs
 * must each get their own position back.
 */

describe("a view that is following the tail", () => {
	test("starts on the tail when its tab has never been scrolled", () => {
		const deps = memory();
		const { rerender } = render(<TailHarness tabKey="tab_a" deps={deps} body="a" />);
		const box = screen.getByTestId("box");
		layout(box, 400, 100);
		rerender(<TailHarness tabKey="tab_a" deps={deps} body="a\nb" />);
		expect(box.scrollTop).toBe(300);
		expect(followingOf(box)).toBe("true");
	});

	test("an append moves the viewport with the tail — measured, not eyeballed", () => {
		const deps = memory();
		const { rerender } = render(<TailHarness tabKey="tab_a" deps={deps} body="a" />);
		const box = screen.getByTestId("box");
		layout(box, 400, 100);
		rerender(<TailHarness tabKey="tab_a" deps={deps} body="a\nb" />);
		// The reader is exactly on the tail: 400 - 300 - 100 = 0.
		expect(distanceFromTail(box)).toBe(0);
		const before = box.scrollTop;
		// The next row lands: 260 px more content, pinned in the same commit's layout
		// effect, before paint.
		layout(box, 660, 100);
		rerender(<TailHarness tabKey="tab_a" deps={deps} body="a\nb\nc" />);
		expect(box.scrollTop).toBe(560);
		expect(box.scrollTop - before).toBe(260);
		expect(distanceFromTail(box)).toBe(0);
	});

	test("a growth this component did not render for is pinned too", async () => {
		const deps = memory();
		const { rerender } = render(<TailHarness tabKey="tab_a" deps={deps} body="a" />);
		const box = screen.getByTestId("box");
		layout(box, 400, 100);
		rerender(<TailHarness tabKey="tab_a" deps={deps} body="a" />);
		expect(box.scrollTop).toBe(300);
		// A child changed on its own — an expanded block, a finished markdown row — so
		// no commit of this component is coming: the box is observed instead.
		layout(box, 600, 100);
		await act(async () => {
			box.textContent = "a\nb\nc\nd";
		});
		expect(box.scrollTop).toBe(500);
		expect(distanceFromTail(box)).toBe(0);
	});
});

describe("unpinning", () => {
	test("the event our own write caused never unpins", () => {
		const deps = memory();
		const { rerender } = render(<TailHarness tabKey="tab_a" deps={deps} body="a" />);
		const box = screen.getByTestId("box");
		layout(box, 400, 100);
		rerender(<TailHarness tabKey="tab_a" deps={deps} body="a\nb" />);
		expect(followingOf(box)).toBe("true");
		// The pin wrote `scrollTop`; the event it produced is ours, one shot.
		box.scrollTop = 120;
		fireEvent.scroll(box);
		expect(followingOf(box)).toBe("true");
		expect(screen.queryByText(JUMP_LATEST_LABEL, { exact: false })).toBeNull();
	});

	test("a scroll nobody's hand caused cannot unpin — a following view is put back", () => {
		const deps = memory();
		const { rerender } = render(<TailHarness tabKey="tab_a" deps={deps} body="a" />);
		const box = screen.getByTestId("box");
		layout(box, 400, 100);
		rerender(<TailHarness tabKey="tab_a" deps={deps} body="a\nb" />);
		// Ours was consumed above by the first event; this one is the browser's own
		// clamp — a programmatic scroll, a layout shift — with no gesture behind it.
		box.scrollTop = 120;
		fireEvent.scroll(box);
		expect(followingOf(box)).toBe("true");
		expect(box.scrollTop).toBe(300);
		expect(screen.queryByText(JUMP_LATEST_LABEL, { exact: false })).toBeNull();
	});

	test("the reader's own upward gesture unpins and offers the pill", () => {
		const deps = memory();
		const { rerender } = render(<TailHarness tabKey="tab_a" deps={deps} body="a" />);
		const box = screen.getByTestId("box");
		layout(box, 400, 100);
		rerender(<TailHarness tabKey="tab_a" deps={deps} body="a\nb" />);
		fireEvent.wheel(box, { deltaY: -120 });
		box.scrollTop = 120;
		fireEvent.scroll(box);
		expect(followingOf(box)).toBe("false");
		expect(screen.getByText(JUMP_LATEST_LABEL, { exact: false })).toBeDefined();
	});

	test("jump-to-latest restores follow and the tail", () => {
		const deps = memory();
		const { rerender } = render(<TailHarness tabKey="tab_a" deps={deps} body="a" />);
		const box = screen.getByTestId("box");
		layout(box, 400, 100);
		rerender(<TailHarness tabKey="tab_a" deps={deps} body="a\nb" />);
		fireEvent.wheel(box, { deltaY: -120 });
		box.scrollTop = 120;
		fireEvent.scroll(box);
		fireEvent.click(screen.getByText(JUMP_LATEST_LABEL, { exact: false }));
		expect(followingOf(box)).toBe("true");
		expect(distanceFromTail(box)).toBe(0);
		expect(screen.queryByText(JUMP_LATEST_LABEL, { exact: false })).toBeNull();
	});
});

describe("per-tab memory", () => {
	test("two tabs each get their own position back, and neither borrows the other's", () => {
		const deps = memory();
		const body = "a\nb\nc";
		const { rerender } = render(<TailHarness tabKey="tab_a" deps={deps} body={body} />);
		const box = screen.getByTestId("box");
		layout(box, 400, 100);
		rerender(<TailHarness tabKey="tab_a" deps={deps} body={body} />);
		// Tab A: the reader scrolls up to 120.
		fireEvent.wheel(box, { deltaY: -120 });
		box.scrollTop = 120;
		fireEvent.scroll(box);
		// Tab B: never scrolled, so it starts on its own tail.
		layout(box, 500, 100);
		rerender(<TailHarness tabKey="tab_b" deps={deps} body="x" />);
		expect(followingOf(box)).toBe("true");
		expect(box.scrollTop).toBe(400);
		// Back to A: its own offset, not B's tail.
		layout(box, 400, 100);
		rerender(<TailHarness tabKey="tab_a" deps={deps} body={body} />);
		expect(followingOf(box)).toBe("false");
		expect(box.scrollTop).toBe(120);
		expect(deps.map.get("tab_a")).toEqual({ offset: 120, following: false });
		expect(deps.map.get("tab_b")).toEqual({ offset: 0, following: true });
	});
});

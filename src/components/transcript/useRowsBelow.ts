import { type RefObject, useLayoutEffect, useState } from "react";
import { countRowsBelow } from "./rowsBelow";

/**
 * The pill's count (M2.22): how many rows the reader has below the fold, kept where
 * the other scroll-derived state lives (`useTailFollow` owns the box and the events).
 *
 * **It costs nothing while the reader is at the tail.** `enabled` is the pill's own
 * condition (`!following`), so a following view installs no listener and measures
 * nothing: the count is 0 and stays there. The whole cost is paid only while the
 * pill is on screen.
 *
 * Scrolled up, it measures on the three events that can change the answer and on
 * nothing else — the effect itself (the unpin, or a new box), a scroll of the box,
 * and a child-list change to the box (a row arrived). Never on a render, and no
 * frame loop: a delta that only grows a row's text changes nothing the count reads
 * at a different scroll position anyway. The measurement itself is bounded by the
 * rows in view (`countRowsBelow`), not by the rows in the transcript.
 *
 * A **layout** effect, not an effect, so the pill's first paint already carries its
 * number rather than flashing a zero.
 */
export function useRowsBelow(ref: RefObject<HTMLElement | null>, enabled: boolean): number {
	const [count, setCount] = useState(0);

	useLayoutEffect(() => {
		if (!enabled) {
			setCount(0);
			return;
		}
		const node = ref.current;
		if (node === null) return;
		const measure = () => setCount(countRowsBelow(node));
		measure();
		node.addEventListener("scroll", measure, { passive: true });
		const mutations =
			typeof MutationObserver === "undefined" ? null : new MutationObserver(measure);
		mutations?.observe(node, { childList: true, subtree: true });
		return () => {
			node.removeEventListener("scroll", measure);
			mutations?.disconnect();
		};
	}, [ref, enabled]);

	return count;
}

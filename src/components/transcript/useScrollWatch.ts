import { type RefObject, useEffect } from "react";

/**
 * The DOM plumbing of tail-follow (M2.9): the scroll container's own events, and
 * the observations that catch a growth no commit of this component caused — a block
 * the reader expanded, a markdown row that finished, a font that loaded.
 *
 * It decides nothing. It reports a scroll and a gesture and asks for a re-pin; the
 * model that turns those into `following` is `useTailFollow.ts`.
 */

export type ScrollWatch = {
	/** A scroll event that is not the echo of our own write. */
	readonly onScroll: () => void;
	/** The reader's own hand: a wheel, a pointer, a key. */
	readonly onGesture: () => void;
	/** A view that is following must go back to the tail. */
	readonly repin: () => void;
};

export function useScrollWatch(ref: RefObject<HTMLElement | null>, watch: ScrollWatch): void {
	const { onScroll, onGesture, repin } = watch;

	useEffect(() => {
		const node = ref.current;
		if (node === null) return;
		const scroll = () => onScroll();
		node.addEventListener("scroll", scroll, { passive: true });
		node.addEventListener("wheel", onGesture, { passive: true });
		node.addEventListener("pointerdown", onGesture);
		// A key is a gesture wherever the focus is: the reader pressing PageDown is
		// scrolling the box, so a keydown that bubbles from the document arms the same
		// guard a wheel does.
		window.addEventListener("keydown", onGesture);
		return () => {
			node.removeEventListener("scroll", scroll);
			node.removeEventListener("wheel", onGesture);
			node.removeEventListener("pointerdown", onGesture);
			window.removeEventListener("keydown", onGesture);
		};
	}, [ref, onScroll, onGesture]);

	useEffect(() => {
		const node = ref.current;
		if (node === null) return;
		const mutations =
			typeof MutationObserver === "undefined" ? null : new MutationObserver(repin);
		mutations?.observe(node, { childList: true, subtree: true, characterData: true });
		const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(repin);
		resize?.observe(node);
		return () => {
			mutations?.disconnect();
			resize?.disconnect();
		};
	}, [ref, repin]);
}

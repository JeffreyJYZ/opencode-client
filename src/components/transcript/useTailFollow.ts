import { type RefObject, useCallback, useLayoutEffect, useRef, useState } from "react";
import type { TabScroll } from "@/app/settings/scroll";
import { rememberTabScroll, tabScroll } from "@/app/settings/tabScroll";
import { atTail, tailTop, viewportOf } from "./tailFollow";
import { useScrollWatch } from "./useScrollWatch";

/**
 * Tail-follow (M2.9): **the state is `following`**, one boolean per mounted
 * transcript view, with a remembered copy per **tab** in the settings blob
 * (`src/app/settings/scroll.ts` and `tabScroll.ts`). Only the active tab's view is
 * mounted, so a per-view live flag plus a per-tab memory is the whole model.
 *
 * The rule that makes it honest is the `ours` guard: **every** scroll the container
 * reports after a write of ours is ours, and only the reader's own gesture (wheel,
 * key, pointer) clears the guard. So a programmatic scroll never unpins, a layout
 * shift never unpins, and the reader's upward gesture always does.
 *
 * Pinning runs in a **layout** effect, after every commit and before paint, so an
 * appended row moves the viewport *with* the tail: the reader's distance from the
 * tail is the same number before and after the row exists.
 */

export type TailFollowDeps = {
	readonly recall?: (key: string) => TabScroll;
	readonly remember?: (key: string, memory: TabScroll) => void;
};

export type TailFollow = {
	readonly ref: RefObject<HTMLElement | null>;
	readonly following: boolean;
	/** Put the reader back on the tail and start following it again. */
	readonly jumpToLatest: () => void;
};

/** The position of a view that is following: the tail, and no offset of its own. */
const PINNED: TabScroll = { offset: 0, following: true };

export function useTailFollow(key: string, deps: TailFollowDeps = {}): TailFollow {
	const recall = deps.recall ?? tabScroll;
	const remember = deps.remember ?? rememberTabScroll;
	const ref = useRef<HTMLElement | null>(null);
	const position = useRef<TabScroll>(recall(key));
	/**
	 * `following` lives in a ref *and* in state. The ref is the truth the layout
	 * effects read — a key change must not leave a commit whose pin sees the previous
	 * tab's flag, or switching back to a scrolled-up tab would land on the tail — and
	 * the state is only what the view renders from.
	 */
	const following = useRef(position.current.following);
	const [followingNow, setFollowingNow] = useState(position.current.following);
	/**
	 * Two facts, and they are the whole of rule 4. `lastWrite` is the `scrollTop` our
	 * own write asked for — an event that reports that value is our echo, not the
	 * reader moving. `reader` is "the reader's own hand is on the box", armed by a
	 * gesture and consumed by the event it causes. Neither a programmatic scroll nor a
	 * layout shift arms `reader`, so neither can unpin.
	 */
	const lastWrite = useRef<number | null>(null);
	const reader = useRef(false);

	const markFollowing = useCallback((next: boolean) => {
		following.current = next;
		setFollowingNow(next);
	}, []);

	/** Put the view where `memory` says and record it as this tab's position. */
	const place = useCallback((memory: TabScroll) => {
		position.current = memory;
		const node = ref.current;
		if (node === null) return;
		const top = memory.following ? tailTop(viewportOf(node)) : memory.offset;
		reader.current = false;
		lastWrite.current = top;
		node.scrollTop = top;
	}, []);

	// A tab's own position comes back when its view mounts, and returns to the blob
	// when the view is left or the key becomes another tab.
	useLayoutEffect(() => {
		const remembered = recall(key);
		markFollowing(remembered.following);
		place(remembered);
		return () => remember(key, position.current);
	}, [key, recall, remember, place, markFollowing]);

	// After every commit: a following view is put back on the tail, before paint.
	useLayoutEffect(() => {
		if (following.current && ref.current !== null) place(PINNED);
	});

	// Nobody's hand moved the box? Then a following view belongs on the tail, so it
	// goes back there; a scrolled-away view keeps the reader's older position.
	const repin = useCallback(() => {
		if (following.current) place(PINNED);
	}, [place]);

	const onScroll = useCallback(() => {
		const node = ref.current;
		if (node === null) return;
		const viewport = viewportOf(node);
		if (lastWrite.current !== null && Math.abs(viewport.scrollTop - lastWrite.current) < 1) {
			return;
		}
		if (reader.current) {
			reader.current = false;
			position.current = { offset: viewport.scrollTop, following: atTail(viewport) };
			markFollowing(position.current.following);
			return;
		}
		if (!following.current) position.current = { offset: viewport.scrollTop, following: false };
		else repin();
	}, [markFollowing, repin]);

	const onGesture = useCallback(() => {
		reader.current = true;
	}, []);

	useScrollWatch(ref, { onScroll, onGesture, repin });

	const jumpToLatest = useCallback(() => {
		markFollowing(true);
		place(PINNED);
	}, [place, markFollowing]);

	return { ref, following: followingNow, jumpToLatest };
}

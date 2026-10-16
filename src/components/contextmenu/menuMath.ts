/**
 * The context menu's pure arithmetic: where it sits and which item a key moves to.
 *
 * Split from the components on purpose (M5.1 requirement 6): the clamp against a
 * viewport edge and the no-wrap item step are the two rules worth a test, and both
 * are ordinary functions over numbers, so they are tested without a DOM.
 */

export type Point = { readonly x: number; readonly y: number };
export type Size = { readonly width: number; readonly height: number };

/** The pointer's viewport point, for the mouse route. */
export function pointerPoint(event: { readonly clientX: number; readonly clientY: number }): Point {
	return { x: event.clientX, y: event.clientY };
}

/** The point just under an element, for the keyboard route (`⇧F10`). */
export function elementPoint(box: { readonly left: number; readonly bottom: number }): Point {
	return { x: box.left, y: box.bottom };
}

/**
 * Where a menu of `size` sits for `at`, kept inside `viewport` with `gutter` to
 * spare. At an edge it **flips** — the pointer stays the anchor and the panel
 * shifts back by its own overflow — and it never leaves the gutter at all, which
 * is what keeps a menu near the bottom-right corner on screen instead of spilling
 * past it. A menu bigger than the viewport clamps to the gutter, the only corner
 * it can still start in.
 */
export function placeMenu(at: Point, size: Size, viewport: Size, gutter: number): Point {
	const maxX = Math.max(gutter, viewport.width - size.width - gutter);
	const maxY = Math.max(gutter, viewport.height - size.height - gutter);
	return {
		x: Math.min(Math.max(at.x, gutter), maxX),
		y: Math.min(Math.max(at.y, gutter), maxY),
	};
}

/**
 * The item one arrow step lands on: no wrap, per the composer menu's own rule
 * (`composerMenuModel.ts`), so a menu cannot cycle and the ends are stable.
 */
export function stepIndex(index: number, count: number, delta: number): number {
	if (count <= 0) return 0;
	return Math.max(0, Math.min(index + delta, count - 1));
}

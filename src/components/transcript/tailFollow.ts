import { TAIL_THRESHOLD_PX } from "@/constants/scroll";

/**
 * The tail-follow arithmetic (M2.9) — pure, so the hook stays a subscription and
 * the numbers are testable without a layout engine, and so "is the reader at the
 * tail?" is one definition rather than a comparison repeated per call site.
 */

/** A scroll container as the model sees it. */
export type Viewport = {
	readonly scrollTop: number;
	readonly scrollHeight: number;
	readonly clientHeight: number;
};

/** How far the viewport is from the tail, in CSS pixels; never negative. */
export function tailDistance(viewport: Viewport): number {
	return Math.max(0, viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight);
}

/** Whether the viewport is on the tail, within `TAIL_THRESHOLD_PX`. */
export function atTail(viewport: Viewport): boolean {
	return tailDistance(viewport) <= TAIL_THRESHOLD_PX;
}

/** The `scrollTop` that puts the viewport on the tail — where a following view sits. */
export function tailTop(viewport: Viewport): number {
	return Math.max(0, viewport.scrollHeight - viewport.clientHeight);
}

/** A live element as a viewport. */
export function viewportOf(element: Element & Viewport): Viewport {
	return {
		scrollTop: element.scrollTop,
		scrollHeight: element.scrollHeight,
		clientHeight: element.clientHeight,
	};
}

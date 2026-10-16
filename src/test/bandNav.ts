import { ROW_ID_ATTR } from "@/constants/transcriptUi";

/**
 * Band-navigation fixtures (M2.23).
 *
 * happy-dom has no layout engine, so a container's `scrollTop` and each row's rect
 * are **set** to the numbers a real layout would produce — and a row's rect moves
 * with the scroll position, as a real one does, so the *content* offset the handler
 * computes stays put. The offsets here are the fixture's; the arithmetic is real.
 */

/** The two bands' offsets in the container's own coordinates. */
export const BAND_OFFSETS = [800, 1300] as const;

/** Where the reader sits before any press: between the two bands. */
export const BAND_START = 1000;

export type BandBox = {
	readonly scroller: HTMLElement;
	readonly bandIds: readonly string[];
	/** The container's live scroll position. */
	readonly position: () => number;
};

/** A scroll container holding two bands, at `BAND_START`. */
export function bandBox(): BandBox {
	const scroller = document.createElement("main");
	let top = BAND_START;
	Object.defineProperty(scroller, "scrollTop", {
		get: () => top,
		set: (value: number) => {
			top = value;
		},
		configurable: true,
	});
	Object.defineProperty(scroller, "getBoundingClientRect", { value: () => ({ top: 0 }) });
	const bandIds = BAND_OFFSETS.map((offset, index) => {
		const id = `band_${index}`;
		const node = document.createElement("article");
		node.setAttribute(ROW_ID_ATTR, id);
		Object.defineProperty(node, "getBoundingClientRect", {
			value: () => ({ top: offset - top }),
		});
		scroller.append(node);
		return id;
	});
	return { scroller, bandIds, position: () => top };
}

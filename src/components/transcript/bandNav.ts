import { type KeyEventLike, matchesBinding } from "@/constants/chords";
import { SHORTCUT_BAND_NEXT, SHORTCUT_BAND_PREVIOUS } from "@/constants/keys";
import { overlayOpen } from "@/constants/overlay";
import { BAND_DIRECTION, type BandDirection } from "@/constants/scroll";
import { ROW_KIND } from "@/constants/transcript";
import { ROW_ID_ATTR } from "@/constants/transcriptUi";
import type { TranscriptRow } from "@/session/transcript";

/**
 * Band navigation (spec 020 §Scroll: "`⌥↑` / `⌥↓` jump between user bands", M2.23).
 *
 * The split is `tabKeys.ts`'s: **matching and the target are pure**, so the offset
 * math is unit-testable without a layout engine, and the **installer takes
 * actions**, so the scroller element and the store stay out of this file.
 *
 * A band is a `ROW_KIND.user` row, addressed in the DOM by `rowIdentity`'s
 * `ROW_ID_ATTR`. The target is a **scroll offset in the container's own
 * coordinates**, and a direction with no band in it is `null` — never the top or
 * the bottom as a fallback.
 */

/** The bands of a row list, in document order: the rows the store calls user rows. */
export function userBandIds(rows: readonly TranscriptRow[]): string[] {
	return rows.filter((row) => row.kind === ROW_KIND.user).map((row) => row.id);
}

/** The band a key event names, or `null` — pure, over the event alone. */
export function bandDirectionFor(event: KeyEventLike): BandDirection | null {
	if (matchesBinding(event, SHORTCUT_BAND_PREVIOUS)) return BAND_DIRECTION.previous;
	if (matchesBinding(event, SHORTCUT_BAND_NEXT)) return BAND_DIRECTION.next;
	return null;
}

/**
 * The offset a jump lands on: the nearest band **strictly** past `current` in that
 * direction, or `null` at the first band (up) / the last (down). `offsets` is
 * ascending, as document order gives them; a strict comparison is what makes the
 * second press move on from the band the first one landed on.
 */
export function bandTarget(
	offsets: readonly number[],
	current: number,
	direction: BandDirection,
): number | null {
	if (direction === BAND_DIRECTION.previous) {
		for (let index = offsets.length - 1; index >= 0; index--) {
			if (offsets[index] < current) return offsets[index];
		}
		return null;
	}
	for (const offset of offsets) {
		if (offset > current) return offset;
	}
	return null;
}

/**
 * The bands' offsets in the container's own scroll coordinates, in document order:
 * a row's distance from the scroller's content origin, measured from the rects so
 * an `offsetParent` that is not the scroller cannot skew it.
 */
export function bandOffsets(scroller: HTMLElement, bandIds: readonly string[]): number[] {
	const bands = new Set(bandIds);
	const base = scroller.getBoundingClientRect().top - scroller.scrollTop;
	const offsets: number[] = [];
	for (const node of scroller.querySelectorAll(`[${ROW_ID_ATTR}]`)) {
		const id = node.getAttribute(ROW_ID_ATTR);
		if (id !== null && bands.has(id)) offsets.push(node.getBoundingClientRect().top - base);
	}
	return offsets;
}

/** What a press reads: the scroller and the bands it holds, both read fresh per press. */
export type BandSource = {
	readonly scroller: HTMLElement | null;
	readonly bandIds: readonly string[];
};

export type BandActions = {
	/** Put the container at `offset`. The caller owns the element and the write. */
	readonly scrollTo: (offset: number) => void;
};

/**
 * Listen for the band chords on `window`; returns the uninstaller. `read` is called
 * per press, so a transcript that grew never leaves the handler stale.
 *
 * These are **window** chords, so they take the window chords' gate: **nothing
 * happens while an overlay dialog is open**, exactly as `keymap.ts` suppresses ⌘,
 * and ⌘B (its ⌘K is the one deliberate exception — it toggles the palette that
 * would otherwise swallow it) and as the strip does. The *surface*-matched chords
 * — the composer's ⌘↩/`Esc`, a region's ⇧F10 — need no gate and are **not** the
 * precedent here: focus cannot reach their element through a modal, so they never
 * see the press. One definition of the gate, `constants/overlay.ts`.
 */
export function installBandKeys(read: () => BandSource, actions: BandActions): () => void {
	const onKeyDown = (event: KeyboardEvent) => {
		// Read per press, like the scroller and the bands: an overlay opened since the
		// install still suppresses the chord, and nothing is captured at install time.
		if (overlayOpen()) return;
		const direction = bandDirectionFor(event);
		if (direction === null || event.defaultPrevented) return;
		const { scroller, bandIds } = read();
		if (scroller === null) return;
		const target = bandTarget(bandOffsets(scroller, bandIds), scroller.scrollTop, direction);
		if (target === null) return;
		event.preventDefault();
		actions.scrollTo(target);
	};
	window.addEventListener("keydown", onKeyDown);
	return () => {
		window.removeEventListener("keydown", onKeyDown);
	};
}

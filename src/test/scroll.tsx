import type { ReactNode } from "react";
import type { TabScroll } from "@/app/settings/scroll";
import { JumpToLatest } from "@/components/transcript/JumpToLatest";
import type { TailFollowDeps } from "@/components/transcript/useTailFollow";
import { useTailFollow } from "@/components/transcript/useTailFollow";

/**
 * Scroll-model fixtures (M2.9).
 *
 * happy-dom has no layout engine, so a box's `scrollHeight`/`clientHeight` are
 * **set** to the numbers a real layout would produce: the hook's own reads are
 * real, and the offsets it writes are the measurement a proof quotes. The memory is
 * injected rather than read from the settings blob, because `recall`/`remember`
 * are the hook's own contract.
 */

export type TestStore = TailFollowDeps & { readonly map: Map<string, TabScroll> };

/** A memory that behaves like the settings cell: empty until something writes. */
export function memory(): TestStore {
	const map = new Map<string, TabScroll>();
	return {
		map,
		recall: (key: string) => map.get(key) ?? { offset: 0, following: true },
		remember: (key: string, value: TabScroll) => {
			map.set(key, value);
		},
	};
}

/** What a real layout would have measured for this box. */
export function layout(element: HTMLElement, scrollHeight: number, clientHeight: number): void {
	Object.defineProperty(element, "scrollHeight", { value: scrollHeight, configurable: true });
	Object.defineProperty(element, "clientHeight", { value: clientHeight, configurable: true });
}

/**
 * What a real layout would have measured for this element's own box, in **viewport**
 * coordinates — a row's top and bottom, or the scroller's visible edge (M2.22). Set
 * rather than read, because happy-dom has no layout engine; the reads stay real.
 */
export function boxAt(element: Element, top: number, height: number): void {
	element.getBoundingClientRect = () => ({ top, bottom: top + height }) as DOMRect;
}

/** The reader's distance from the tail — the number an append must not change. */
export function distanceFromTail(box: HTMLElement): number {
	return box.scrollHeight - box.scrollTop - box.clientHeight;
}

/** What the view says it is doing, from the DOM rather than from the hook. */
export function followingOf(box: HTMLElement): string | null {
	return box.getAttribute("data-following");
}

/** A transcript view with the hook's box, its flag and its pill — the real shapes. */
export function TailHarness({
	tabKey,
	deps,
	body,
}: {
	readonly tabKey: string;
	readonly deps: TestStore;
	readonly body: ReactNode;
}) {
	const follow = useTailFollow(tabKey, deps);
	return (
		<>
			<main ref={follow.ref} data-testid="box" data-following={String(follow.following)}>
				{body}
			</main>
			{!follow.following && (
				<JumpToLatest count={follow.rowsBelow} onClick={follow.jumpToLatest} />
			)}
		</>
	);
}

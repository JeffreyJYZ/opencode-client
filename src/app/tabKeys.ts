import {
	MAX_KEYBOARD_TAB,
	MIN_KEYBOARD_TAB,
	SHORTCUT_CLOSE_TAB,
	SHORTCUT_NEW_SESSION,
} from "@/constants/keys";

/**
 * The tab strip's keys (spec 010 §Desktop behaviours): ⌘T, ⌘1…⌘9, ⌘W.
 *
 * Matching is pure so the index math is unit-testable without a DOM. The
 * installer takes actions, so the store and the router stay out of this file.
 */

export type TabKeyActions = {
	readonly onNewSession: () => void;
	readonly onCloseActive: () => void;
	readonly onSwitchTab: (index: number) => void;
};

function hasCommandModifier(event: KeyboardEvent): boolean {
	return event.metaKey || event.ctrlKey;
}

/** Whether the event names the binding's key, case-insensitively. */
export function matchesShortcut(
	event: { readonly key: string; readonly metaKey: boolean; readonly ctrlKey: boolean },
	binding: { readonly key: string },
): boolean {
	return event.key.toLowerCase() === binding.key.toLowerCase();
}

function isTabKeyEvent(event: KeyboardEvent): boolean {
	return hasCommandModifier(event) && !event.defaultPrevented;
}

/**
 * The strip index a ⌘digit names, or `null`. ⌘1 is the first tab; a digit past
 * the strip's end is a no-op, never a wrap.
 */
export function indexForDigit(digit: string, count: number): number | null {
	if (!/^[1-9]$/.test(digit)) return null;
	const position = Number.parseInt(digit, 10);
	if (position < MIN_KEYBOARD_TAB || position > MAX_KEYBOARD_TAB) return null;
	const index = position - 1;
	return index < count ? index : null;
}

/** Handle one keydown; returns `true` when it consumed the event. */
export function handleTabKey(
	event: KeyboardEvent,
	tabCount: number,
	actions: TabKeyActions,
): boolean {
	if (!isTabKeyEvent(event)) return false;
	if (matchesShortcut(event, SHORTCUT_NEW_SESSION)) {
		event.preventDefault();
		actions.onNewSession();
		return true;
	}
	if (matchesShortcut(event, SHORTCUT_CLOSE_TAB)) {
		event.preventDefault();
		actions.onCloseActive();
		return true;
	}
	const index = indexForDigit(event.key, tabCount);
	if (index !== null) {
		event.preventDefault();
		actions.onSwitchTab(index);
		return true;
	}
	return false;
}

/**
 * Listen for the strip's keys on `window`. Returns the uninstaller. The tab
 * count is read fresh per keypress, so the handler never goes stale.
 */
export function installTabKeyboard(readCount: () => number, actions: TabKeyActions): () => void {
	const onKeyDown = (event: KeyboardEvent) => {
		handleTabKey(event, readCount(), actions);
	};
	window.addEventListener("keydown", onKeyDown);
	return () => {
		window.removeEventListener("keydown", onKeyDown);
	};
}

import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { elementPoint, type Point, pointerPoint } from "@/components/contextmenu/menuMath";
import { matchesBinding } from "@/constants/chords";
import { SHORTCUT_CONTEXT_MENU } from "@/constants/keys";

/**
 * A surface's context-menu state (M5.1): what the menu is about (`target`), where
 * it sits (`at`), and who opened it (`opener`).
 *
 * Three things the caller gets for free and must not re-implement:
 *
 * - **focus restore** — on every close, focus returns to the element that opened
 *   the menu, if that element is still in the document (requirement 1);
 * - **one menu at a time per surface** — opening again replaces the state, so a
 *   second right-click moves the menu rather than stacking one;
 * - **the `⇧F10` route** — `isContextMenuKey` is the registry's own binding, so
 *   the surface matches it and no chord is claimed twice.
 */

export type ContextMenuOpen = {
	/** What the menu is about: the row, tab or panel key the surface can re-check. */
	readonly target: string;
	readonly at: Point;
	readonly opener: HTMLElement;
};

export type ContextMenuHandle = {
	/** Non-null while a menu is open: where it should sit. */
	readonly point: Point | null;
	readonly target: string | null;
	readonly open: (input: ContextMenuOpen) => void;
	readonly close: () => void;
};

/** Whether a key event is the map's context-menu chord (`SHORTCUT_CONTEXT_MENU`). */
export function isContextMenuKey(event: {
	readonly key: string;
	readonly metaKey: boolean;
	readonly ctrlKey: boolean;
	readonly altKey: boolean;
	readonly shiftKey: boolean;
}): boolean {
	return matchesBinding(event, SHORTCUT_CONTEXT_MENU);
}

export function useContextMenu(): ContextMenuHandle {
	const [state, setState] = useState<ContextMenuOpen | null>(null);
	const opener = useRef<HTMLElement | null>(null);
	const wasOpen = useRef(false);

	const open = useCallback((input: ContextMenuOpen) => {
		opener.current = input.opener;
		setState(input);
	}, []);
	const close = useCallback(() => setState(null), []);

	useEffect(() => {
		if (state !== null) {
			wasOpen.current = true;
			return;
		}
		if (!wasOpen.current) return;
		wasOpen.current = false;
		// A gone opener is not a failure: the menu's own action may have removed it
		// (a closed tab, a hidden sidebar), and there is nothing left to focus.
		if (opener.current?.isConnected === true) opener.current.focus();
	}, [state]);

	return useMemo(
		() => ({ point: state?.at ?? null, target: state?.target ?? null, open, close }),
		[state, open, close],
	);
}

/**
 * The per-element wiring a surface spreads onto the element that *is* the menu's
 * target: `onContextMenu` for the pointer, `onMenuKey` for `⇧F10`. One helper, so
 * four surfaces cannot each invent their own chord or their own opener.
 *
 * The handle is memoised, so an element that memoises itself (a transcript row)
 * does not re-render merely because a menu exists somewhere in the app.
 */
export type SurfaceMenuHandle = {
	/** Non-null while a menu is open: where it should sit. */
	readonly point: Point | null;
	/** The surface key the open menu is about; `null` while none is open. */
	readonly target: string | null;
	readonly onContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
	/** Consume the registry's `⇧F10`; `false` for every other key, so the caller keeps its own. */
	readonly onMenuKey: (event: ReactKeyboardEvent<HTMLElement>) => boolean;
	readonly close: () => void;
};

export function useSurfaceMenu(target: string): SurfaceMenuHandle {
	const menu = useContextMenu();
	const onContextMenu = useCallback(
		(event: ReactMouseEvent<HTMLElement>) => {
			event.preventDefault();
			menu.open({ target, at: pointerPoint(event), opener: event.currentTarget });
		},
		[menu, target],
	);
	const onMenuKey = useCallback(
		(event: ReactKeyboardEvent<HTMLElement>) => {
			if (!isContextMenuKey(event)) return false;
			event.preventDefault();
			const opener = event.currentTarget;
			menu.open({ target, at: elementPoint(opener.getBoundingClientRect()), opener });
			return true;
		},
		[menu, target],
	);
	return useMemo(
		() => ({
			point: menu.point,
			target: menu.target,
			onContextMenu,
			onMenuKey,
			close: menu.close,
		}),
		[menu, onContextMenu, onMenuKey],
	);
}

/**
 * Close an open menu whose target has gone (requirement 4): a surface passes
 * `alive: false` once the row, tab or panel the menu was opened for is no longer
 * in its data, and the menu closes instead of pointing at nothing.
 */
export function useCloseWhenTargetGone(menu: ContextMenuHandle, alive: boolean): void {
	useEffect(() => {
		if (menu.point !== null && !alive) menu.close();
	}, [menu, alive]);
}

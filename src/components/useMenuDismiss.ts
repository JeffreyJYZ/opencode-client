import { type RefObject, useEffect } from "react";
import { KEY_ESCAPE } from "@/constants/keys";

/**
 * Dismiss a popover on Escape or a mousedown outside the anchor element.
 * Used by the tab strip's overflow menu.
 */
export function useMenuDismiss(
	open: boolean,
	setOpen: (next: boolean | ((prev: boolean) => boolean)) => void,
	anchor: RefObject<HTMLElement | null>,
): void {
	useEffect(() => {
		if (!open) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === KEY_ESCAPE) setOpen(false);
		};
		const onClick = (event: MouseEvent) => {
			if (!anchor.current?.contains(event.target as Node)) setOpen(false);
		};
		document.addEventListener("keydown", onKey);
		document.addEventListener("mousedown", onClick);
		return () => {
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("mousedown", onClick);
		};
	}, [open, setOpen, anchor]);
}

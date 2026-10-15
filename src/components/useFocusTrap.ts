import { type RefObject, useEffect } from "react";

/**
 * Keep Tab inside an open overlay (spec 010 §Desktop behaviours). Escape and the
 * outside click are the overlay's own concern; this hook only stops focus from
 * walking out of a modal and onto the page behind it.
 */

/** The elements Tab may reach. `tabindex="-1"` is programmatic focus only. */
const FOCUSABLE =
	"a[href], button:not([disabled]):not([tabindex='-1']), input:not([disabled]):not([tabindex='-1']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
	useEffect(() => {
		if (!active) return;
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Tab") return;
			const root = ref.current;
			if (root === null) return;
			const nodes = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
			if (nodes.length === 0) return;
			const first = nodes[0];
			const last = nodes[nodes.length - 1];
			const current = document.activeElement;
			const inside = current instanceof HTMLElement && root.contains(current);
			if (event.shiftKey) {
				if (!inside || current === first) {
					event.preventDefault();
					last.focus();
				}
			} else if (!inside || current === last) {
				event.preventDefault();
				first.focus();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [ref, active]);
}

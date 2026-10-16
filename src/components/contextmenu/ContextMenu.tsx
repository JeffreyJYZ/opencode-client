import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
	MENU_ACCEL_STYLE,
	MENU_BACKDROP_STYLE,
	MENU_ITEM_DISABLED_STYLE,
	MENU_ITEM_LABEL_STYLE,
	MENU_ITEM_STYLE,
	MENU_STYLE,
} from "@/components/contextmenu/contextMenuStyles";
import type { MenuItem } from "@/components/contextmenu/menuItems";
import { type Point, placeMenu, stepIndex } from "@/components/contextmenu/menuMath";
import { useFocusTrap } from "@/components/useFocusTrap";
import {
	CONTEXT_MENU_LABEL,
	MENU_BACKDROP_ATTR,
	MENU_DISMISS_LABEL,
	MENU_EDGE_GUTTER_PX,
} from "@/constants/menu";

/**
 * The menu primitive (M5.1 requirement 1): one item list, rendered positioned
 * inside the viewport, focus-trapping, Escape-closing, focus-restoring.
 *
 * It is deliberately ignorant of *what* it lists — the four surfaces differ only
 * in the `items` they hand it. Focus is **real DOM focus on the buttons**, which is
 * what makes `Enter` a browser behaviour instead of a second key handler and what
 * lets `useFocusTrap` hold `Tab` inside.
 *
 * Every way out goes through `onClose`, which is the caller's state: Escape, the
 * outside click on the backdrop, and activating the menu's own use of the item.
 */

export type ContextMenuProps = {
	readonly items: readonly MenuItem[];
	readonly at: Point;
	readonly onClose: () => void;
};

/** The items an arrow key may land on: a disabled item is not a stop. */
const ITEM_SELECTOR = 'button[role="menuitem"]:not([disabled])';

export function ContextMenu({ items, at, onClose }: ContextMenuProps) {
	const menuRef = useRef<HTMLDivElement | null>(null);
	const [point, setPoint] = useState<Point>(at);

	useFocusTrap(menuRef, true);

	// Measure, then place: the size decides where the clamp puts the panel, and a
	// layout effect means the first paint is already inside the viewport edge.
	useLayoutEffect(() => {
		const menu = menuRef.current;
		if (menu === null) return;
		const box = menu.getBoundingClientRect();
		setPoint(
			placeMenu(
				at,
				{ width: box.width, height: box.height },
				{ width: window.innerWidth, height: window.innerHeight },
				MENU_EDGE_GUTTER_PX,
			),
		);
	}, [at]);

	// The menu owns the keys from the moment it opens: the first reachable item.
	useEffect(() => {
		menuRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
	}, []);

	const reachable = (): HTMLElement[] => [
		...(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []),
	];

	const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
		if (event.key === "Escape") {
			// The menu's Escape closes the menu and **only** the menu: it must not also
			// read as the interrupt `Esc` binds (registry, `SHORTCUT_INTERRUPT`).
			event.preventDefault();
			event.stopPropagation();
			onClose();
			return;
		}
		const delta = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
		if (delta === 0) return;
		event.preventDefault();
		const nodes = reachable();
		if (nodes.length === 0) return;
		const current = nodes.indexOf(document.activeElement as HTMLElement);
		nodes[stepIndex(current, nodes.length, delta)]?.focus();
	};

	return (
		<>
			<button
				{...{ [MENU_BACKDROP_ATTR]: "" }}
				type="button"
				tabIndex={-1}
				aria-label={MENU_DISMISS_LABEL}
				style={MENU_BACKDROP_STYLE}
				onMouseDown={onClose}
				onContextMenu={(event) => {
					event.preventDefault();
					onClose();
				}}
			/>
			<div
				ref={menuRef}
				role="menu"
				aria-label={CONTEXT_MENU_LABEL}
				style={{ ...MENU_STYLE, left: point.x, top: point.y }}
				onKeyDown={onKeyDown}
			>
				{items.map((item) => (
					<button
						key={item.id}
						type="button"
						role="menuitem"
						disabled={item.disabled === true}
						title={item.disabled === true ? item.disabledHint : undefined}
						style={item.disabled === true ? MENU_ITEM_DISABLED_STYLE : MENU_ITEM_STYLE}
						onClick={() => {
							// Close first, so focus returns to the opener while it still exists.
							onClose();
							item.run();
						}}
					>
						<span style={MENU_ITEM_LABEL_STYLE}>{item.label}</span>
						{item.accelerator === undefined ? null : (
							<span style={MENU_ACCEL_STYLE}>{item.accelerator}</span>
						)}
					</button>
				))}
			</div>
		</>
	);
}

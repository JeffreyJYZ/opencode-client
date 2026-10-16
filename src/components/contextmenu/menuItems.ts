import type { KeyBinding } from "@/constants/chords";

/**
 * One row of a context menu (M5.1).
 *
 * `label` and `accelerator` are the **registry row's own words** — the description
 * and label of the binding the item resolves to — so a menu is the keyboard map
 * with a pointer attached, never a second list of what the app can do. The one
 * item the map cannot supply carries its route ("Enter", the element's own key) in
 * the same `accelerator` field, so no item is silent about how keyboard reaches it.
 */
export type MenuItem = {
	/** The registry binding's id, or the one id `constants/menu.ts` gives the unbound item. */
	readonly id: string;
	readonly label: string;
	/** The chord, exactly as the keymap help prints it. */
	readonly accelerator?: string;
	/** The registry row this item resolves to; absent only for the unbound item. */
	readonly binding?: KeyBinding;
	readonly disabled?: boolean;
	/** Why it is inert. Shown as the item's `title`, so a dim row is never a mystery. */
	readonly disabledHint?: string;
	readonly run: () => void;
};

export type MenuItemOptions = {
	readonly disabled?: boolean;
	readonly disabledHint?: string;
};

/** An item whose action is a chord of the map: its words come from that row. */
export function boundItem(
	binding: KeyBinding,
	run: () => void,
	options: MenuItemOptions = {},
): MenuItem {
	return {
		id: binding.id,
		label: binding.description,
		accelerator: binding.label,
		binding,
		disabled: options.disabled,
		disabledHint: options.disabledHint,
		run,
	};
}

import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import { getSlotContributions, subscribeToRegistry } from "@/plugins/registry";
import type { SlotName } from "@/plugins/slots";

/**
 * Render what is registered for a slot, in registration order (spec 040 §Slots).
 *
 * An empty slot renders **nothing at all** — no wrapper element, no placeholder,
 * no warning. A wrapper would put a node in the layout that no contributor asked
 * for, and the layout is where a `topnav.left` or a transcript row lives.
 */
export function Slot({ id }: { readonly id: SlotName }) {
	const contributions = useSyncExternalStore(subscribeToRegistry, () => getSlotContributions(id));
	return (
		<>
			{contributions.map((entry) => (
				<entry.component key={entry.id} />
			))}
		</>
	);
}

/**
 * A slot host that needs a container of its own (M4.12): it renders the styled
 * element **only while the slot has a contribution**, so a mount that wants a
 * toolbar row leaves no empty node — and no stray margin — when nothing is
 * registered. `data-slot` names the region, the way `data-route`/`data-row` do.
 */
export function SlotRegion({
	id,
	style,
}: {
	readonly id: SlotName;
	readonly style?: CSSProperties;
}) {
	const filled = useSyncExternalStore(
		subscribeToRegistry,
		() => getSlotContributions(id).length > 0,
	);
	if (!filled) return null;
	return (
		<div data-slot={id} style={style}>
			<Slot id={id} />
		</div>
	);
}

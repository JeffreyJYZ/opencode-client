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

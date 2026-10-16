import type { Disposable } from "@/plugins/disposable";
import { register } from "@/plugins/registry";
import type { SlotName } from "@/plugins/slots";

/**
 * The probe contribution M4.12's host tests register (spec 040 §Slots): one
 * component per slot, rendering a marker that names the slot, so a test asserts
 * **where** a contribution landed rather than that the registry holds it.
 *
 * It goes through the same `register` a plugin's `host.ui.register` reaches, so a
 * passing host test is a proof about the plugin path, not a test-only route.
 */

/** The text a probe into `slot` renders; unique per slot, so one document is enough. */
export function slotMarker(slot: SlotName): string {
	return `m412-probe:${slot}`;
}

/** Register one probe into `slot`. The caller disposes the handle after the test. */
export function probeSlot(slot: SlotName): Disposable {
	return register({
		id: slotMarker(slot),
		slot,
		component: () => <span>{slotMarker(slot)}</span>,
	});
}

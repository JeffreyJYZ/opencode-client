import { FAULT_AREAS, FAULT_REASONS, recordFault } from "@/plugins/faults";
import { LOCKED_SLOTS, type SlotName } from "@/plugins/slots";

/**
 * The two locked areas as the manager lists them (M4.17, spec 040 §Model).
 *
 * `getBuiltinAreaRows` returns the areas themselves — `app.substrate`, the
 * shell's own slot, and `app.builtins`, the built-ins' grouping — so the
 * surface is honest about what exists. `app.builtins` holds no entries of its
 * own: its members register through the same calls a plugin uses and render
 * where their hosts already draw them, so the row is the *area*, not its
 * members. (Spec 040 §Slots reads as though both are places to draw; the
 * controller corrects the spec.)
 *
 * `refuseDisableLockedArea` is what a disable click on either row calls. The
 * refusal records the locked-area fault naming the area, through the same
 * fault store the manager already renders, and acts on nothing: no loader
 * call, no enabled flag, no registry change — because without the substrate
 * there is no window to recover into.
 */

/** Every locked area, as a manager row; a static list, so the section renders it unsubscribed. */
export function getBuiltinAreaRows(): readonly SlotName[] {
	return LOCKED_SLOTS;
}

/** Refuse a disable attempt on a locked area: record the fault naming it, change nothing. */
export function refuseDisableLockedArea(area: SlotName): void {
	recordFault({
		area: FAULT_AREAS.slots,
		reason: FAULT_REASONS.lockedArea,
		subject: area,
		message: `the built-in area "${area}" is locked; disabling it would remove the shell with no way back`,
	});
}

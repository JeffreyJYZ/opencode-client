import type { ComponentType } from "react";
import { type Collection, createCollection } from "@/plugins/collection";
import { type Disposable, REFUSED } from "@/plugins/disposable";
import { FAULT_AREAS, FAULT_REASONS, type FaultReason, recordFault } from "@/plugins/faults";
import { isLockedSlot, isSlotName, type SlotName } from "@/plugins/slots";
import { slotProblem } from "@/plugins/slotValidation";

/**
 * The slot registry (spec 040 §The host, `ui.register`): a built-in area and a
 * plugin register through this one API, and there is no second path.
 *
 * A refused contribution is inert. An unknown slot, a locked area, a duplicate id
 * or a malformed entry is dropped, recorded as a `PluginFault`, and never throws —
 * so a typo renders nothing and is invisible until the manager's log panel is open.
 *
 * **Who is registering** decides the lock: the substrate (a built-in) may
 * contribute to `app.substrate` / `app.builtins`, a plugin may not, and the
 * refusal is a check on `Actor.pluginId`, not a convention. Storage is
 * `collection.ts`; this module is the slot policy.
 */

/** What a contribution carries. `id` is unique across every slot. */
export type SlotContribution = {
	readonly id: string;
	readonly slot: string;
	readonly component: ComponentType;
	/** Lower sorts first; without one a contribution sorts after every ordered one. */
	readonly order?: number;
};

/** One registered contribution, as `<Slot>` renders it. */
export type SlotEntry = {
	readonly id: string;
	readonly component: ComponentType;
	readonly order?: number;
};

/** Who is registering: the substrate (built-ins), or a named plugin. */
export type Actor = { readonly pluginId: string | null };

/** The substrate's actor: the only caller a locked area accepts. */
export const SUBSTRATE: Actor = { pluginId: null };

const bySlot = new Map<SlotName, Collection<SlotEntry>>();
const ids = new Set<string>();
const listeners = new Set<() => void>();
/** Unknown slot names already reported, so a re-render cannot spam the log. */
const reportedUnknownSlots = new Set<string>();

/** The one empty slot: a stable identity, which `useSyncExternalStore` needs. */
const EMPTY: readonly SlotEntry[] = [];

function notify(): void {
	for (const listener of listeners) listener();
}

function collectionFor(slot: SlotName): Collection<SlotEntry> {
	const existing = bySlot.get(slot);
	if (existing !== undefined) return existing;
	const created = createCollection<SlotEntry>({ onChange: notify });
	bySlot.set(slot, created);
	return created;
}

function refuse(reason: FaultReason, subject: string, message: string): Disposable {
	recordFault({ area: FAULT_AREAS.slots, reason, subject, message });
	return REFUSED;
}

export function subscribeToRegistry(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Register one contribution. Synchronous, per spec 040 §The host; the returned
 * handle removes exactly this entry and is a no-op once it has been disposed.
 */
export function register(contribution: SlotContribution, actor: Actor = SUBSTRATE): Disposable {
	const slot = contribution.slot;
	const subject = typeof contribution.id === "string" ? contribution.id : "?";
	if (!isSlotName(slot)) {
		return refuse(
			FAULT_REASONS.unknownSlot,
			subject,
			`"${subject}" names the unknown slot "${String(slot)}"`,
		);
	}
	if (isLockedSlot(slot) && actor.pluginId !== null) {
		return refuse(
			FAULT_REASONS.lockedArea,
			subject,
			`the slot "${slot}" is locked; the plugin "${actor.pluginId}" cannot contribute to it`,
		);
	}
	const problem = slotProblem(contribution);
	if (problem !== null) {
		return refuse(FAULT_REASONS.malformedEntry, subject, `"${subject}" has ${problem}`);
	}
	if (ids.has(contribution.id)) {
		return refuse(
			FAULT_REASONS.duplicateId,
			contribution.id,
			`the id "${contribution.id}" is already registered`,
		);
	}
	const entry: SlotEntry = {
		id: contribution.id,
		component: contribution.component,
		order: contribution.order,
	};
	const collection = collectionFor(slot);
	const stored = collection.set(entry);
	ids.add(entry.id);
	return {
		dispose(): void {
			// Identity first: a later registration under this id replaced our entry,
			// and disposing the stale handle must not free the id or remove the new
			// one (the collection's handle already guards the removal; this guards
			// the id set too, or the new handle could never remove itself).
			if (collection.get(entry.id) !== entry) return;
			stored.dispose();
			ids.delete(entry.id);
		},
	};
}

/**
 * What a slot renders now, in order. A slot with nothing registered returns the
 * same empty array on every call, and an unknown name is refused the way a
 * registration is — once, so one typo cannot fill the log from a re-render.
 */
export function getSlotContributions(slot: string): readonly SlotEntry[] {
	if (!isSlotName(slot)) {
		if (!reportedUnknownSlots.has(slot)) {
			reportedUnknownSlots.add(slot);
			recordFault({
				area: FAULT_AREAS.slots,
				reason: FAULT_REASONS.unknownSlot,
				subject: slot,
				message: `the slot "${slot}" is not a known slot`,
			});
		}
		return EMPTY;
	}
	return bySlot.get(slot)?.list() ?? EMPTY;
}

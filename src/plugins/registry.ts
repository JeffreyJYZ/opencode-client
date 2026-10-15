import type { ComponentType } from "react";
import { type Disposable, REFUSED } from "@/plugins/disposable";
import { FAULT_AREAS, FAULT_REASONS, type FaultReason, recordFault } from "@/plugins/faults";
import { isSlotName, type SlotName } from "@/plugins/slots";
import { isComponent } from "@/plugins/validation";

/**
 * The slot registry (spec 040 §The host, `ui.register`): a built-in area and a
 * plugin register through this one API, and there is no second path.
 *
 * A refused contribution is inert. An unknown slot, a duplicate id or a
 * malformed entry is dropped, recorded as a `PluginFault`, and never throws — so
 * a typo renders nothing and is invisible until the manager's log panel is open.
 */

/** What a contribution carries. `id` is unique across every slot. */
export type SlotContribution = {
	readonly id: string;
	readonly slot: string;
	readonly component: ComponentType;
	/** Lower sorts first; without one a contribution keeps registration order. */
	readonly order?: number;
};

/** One registered contribution, as `<Slot>` renders it. */
export type SlotEntry = {
	readonly id: string;
	readonly component: ComponentType;
};

/** The order a contribution that names none gets. */
export const DEFAULT_ORDER = 0;

type StoredEntry = SlotEntry & { readonly order: number };

const bySlot = new Map<SlotName, readonly StoredEntry[]>();
const byId = new Map<string, StoredEntry>();
const listeners = new Set<() => void>();
/** Unknown slot names already reported, so a re-render cannot spam the log. */
const reportedUnknownSlots = new Set<string>();

/** The one empty slot: a stable identity, which `useSyncExternalStore` needs. */
const EMPTY: readonly StoredEntry[] = [];

function notify(): void {
	for (const listener of listeners) listener();
}

function refuse(reason: FaultReason, subject: string, message: string): Disposable {
	recordFault({ area: FAULT_AREAS.slots, reason, subject, message });
	return REFUSED;
}

/** Insert before the first higher order, so equal orders keep registration order. */
function withEntry(entries: readonly StoredEntry[], entry: StoredEntry): StoredEntry[] {
	const at = entries.findIndex((existing) => existing.order > entry.order);
	if (at === -1) return [...entries, entry];
	return [...entries.slice(0, at), entry, ...entries.slice(at)];
}

function problemWith(contribution: SlotContribution): string | null {
	if (typeof contribution.id !== "string" || contribution.id.trim() === "") return "an empty id";
	if (!isComponent(contribution.component)) return "a missing or malformed component";
	const order = contribution.order;
	if (order !== undefined && !Number.isFinite(order)) {
		return `a non-finite order (${String(order)})`;
	}
	return null;
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
export function register(contribution: SlotContribution): Disposable {
	const slot = contribution.slot;
	if (!isSlotName(slot)) {
		return refuse(
			FAULT_REASONS.unknownSlot,
			contribution.id,
			`"${String(contribution.id)}" names the unknown slot "${slot}"`,
		);
	}
	const problem = problemWith(contribution);
	if (problem !== null) {
		return refuse(
			FAULT_REASONS.malformedEntry,
			contribution.id,
			`"${String(contribution.id)}" has ${problem}`,
		);
	}
	if (byId.has(contribution.id)) {
		return refuse(
			FAULT_REASONS.duplicateId,
			contribution.id,
			`the id "${contribution.id}" is already registered`,
		);
	}
	const entry: StoredEntry = {
		id: contribution.id,
		component: contribution.component,
		order: contribution.order ?? DEFAULT_ORDER,
	};
	byId.set(entry.id, entry);
	bySlot.set(slot, withEntry(bySlot.get(slot) ?? EMPTY, entry));
	notify();
	return {
		dispose(): void {
			if (byId.get(entry.id) !== entry) return;
			byId.delete(entry.id);
			const remaining = (bySlot.get(slot) ?? EMPTY).filter((existing) => existing !== entry);
			if (remaining.length === 0) bySlot.delete(slot);
			else bySlot.set(slot, remaining);
			notify();
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
	return bySlot.get(slot) ?? EMPTY;
}

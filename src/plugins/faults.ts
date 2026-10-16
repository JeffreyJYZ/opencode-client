/**
 * Faults the host refused to act on (spec 040 §The host). A contribution with an
 * unknown slot, a duplicate id or a malformed entry is dropped and recorded here,
 * never thrown — so nothing renders and this list is the only trace of it.
 *
 * Separate from the registries on purpose: the plugin manager (M4.5) reads this
 * list, and nothing else does.
 */

export const FAULT_REASONS = {
	unknownSlot: "unknown-slot",
	duplicateId: "duplicate-id",
	duplicatePath: "duplicate-path",
	malformedEntry: "malformed-entry",
	/** A theme a caller offered that is not a theme (M3.4), or an id nobody registered. */
	invalidTheme: "invalid-theme",
	/** A theme claiming one of the `--oc-font*` variables; the user's typography wins. */
	protectedVariable: "protected-variable",
} as const;

export type FaultReason = (typeof FAULT_REASONS)[keyof typeof FAULT_REASONS];

/** Which registry refused — the grouping the manager renders. */
export const FAULT_AREAS = {
	slots: "slots",
	routes: "routes",
	themes: "themes",
} as const;

export type FaultArea = (typeof FAULT_AREAS)[keyof typeof FAULT_AREAS];

export type PluginFault = {
	readonly id: number;
	readonly area: FaultArea;
	readonly reason: FaultReason;
	/** What was refused: a contribution id, a slot name or a path. */
	readonly subject: string;
	readonly message: string;
};

/** A fault as a caller reports it; the store assigns the id. */
export type FaultInput = Omit<PluginFault, "id">;

let faults: readonly PluginFault[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function notify(): void {
	for (const listener of listeners) listener();
}

/** Record a refusal; returns it, so a caller may log the same object. */
export function recordFault(input: FaultInput): PluginFault {
	const fault: PluginFault = { id: nextId++, ...input };
	faults = [...faults, fault];
	notify();
	return fault;
}

/** Every fault so far, oldest first. A stable identity until one is added. */
export function listFaults(): readonly PluginFault[] {
	return faults;
}

/** Drop every fault. The tests' reset; the manager (M4.5) may offer it as "clear". */
export function clearFaults(): void {
	faults = [];
	notify();
}

export function subscribeToFaults(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

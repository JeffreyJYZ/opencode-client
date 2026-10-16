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
	/** A settings section threw while rendering; the surface drops it and keeps the rest (M3.5). */
	sectionThrew: "section-threw",
	/** A manifest whose `id` is not one safe path component (M4.1). */
	invalidId: "invalid-id",
	/** A manifest declaring a capability outside the consent list (M4.1). */
	unknownCapability: "unknown-capability",
	/** A manifest built for a different host API **major** (M4.1). */
	unsupportedApiVersion: "unsupported-api-version",
	/** A manifest with no, or an unsatisfiable, `engines.app` (M4.1). */
	enginesApp: "engines-app",
	/** Any other manifest shape a plugin.json failed (M4.1). */
	invalidManifest: "invalid-manifest",
	/** A plugin entry that did not import (M4.2). */
	importFailed: "import-failed",
	/** A plugin entry that still carries a bare specifier; a built entry must import nothing (M4.2). */
	bareSpecifier: "bare-specifier",
	/** A plugin entry imported without the host globals it was built to expect (M4.2). */
	missingGlobals: "missing-globals",
	/** A plugin entry that exports no `setup` function (M4.2). */
	noSetup: "no-setup",
	/** A plugin `setup` threw while registering (M4.2). */
	setupThrew: "setup-threw",
	/** A plugin's `dispose` threw while the loader was closing its instance (M4.2). */
	disposeThrew: "dispose-threw",
	/** A plugin tried to contribute to a locked area (M4.3). */
	lockedArea: "locked-area",
	/** A renderer for a kind the transcript does not have (M4.3). */
	unknownKind: "unknown-kind",
	/** A call naming an id nobody registered, e.g. `commands.run` (M4.3). */
	unknownId: "unknown-id",
	/** A `storage` write that would put a plugin over `PLUGIN_DATA_MAX_BYTES` (M4.4). */
	storageOverCap: "storage-over-cap",
	/** A `storage` key that is empty or not one path-safe component (M4.4). */
	invalidKey: "invalid-key",
	/** A `native` path that is absolute, climbs out, or resolves outside the data dir (M4.4). */
	pathEscape: "path-escape",
} as const;

export type FaultReason = (typeof FAULT_REASONS)[keyof typeof FAULT_REASONS];

/** Which registry refused — the grouping the manager renders. */
export const FAULT_AREAS = {
	slots: "slots",
	routes: "routes",
	themes: "themes",
	settings: "settings",
	/** A manifest refused, or a plugin entry refused at load (M4.1, M4.2). */
	plugins: "plugins",
	/** A palette command contribution (M4.3). */
	commands: "commands",
	/** A sidebar panel contribution (M4.3). */
	panels: "panels",
	/** A transcript renderer contribution (M4.3). */
	renderers: "renderers",
	/** A `storage` service refusal (M4.4). */
	storage: "storage",
	/** A `native` service refusal (M4.4). */
	native: "native",
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

/**
 * Drop the faults recorded against one subject (M4.5): uninstalling a plugin
 * removes the faults its **id** carries, so a removed plugin leaves nothing behind.
 * A fault a registry recorded against a contribution id is not addressed here — the
 * registry's `subject` is the contribution, not the plugin that offered it.
 */
export function clearFaultsFor(subject: string): void {
	const remaining = faults.filter((fault) => fault.subject !== subject);
	if (remaining.length === faults.length) return;
	faults = remaining;
	notify();
}

export function subscribeToFaults(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

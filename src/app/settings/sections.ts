import { type ComponentType, useSyncExternalStore } from "react";
import { sectionProblem } from "@/app/settings/sectionValidation";
import { compareByOrder, NO_ORDER } from "@/plugins/collection";
import { FAULT_AREAS, FAULT_REASONS, recordFault } from "@/plugins/faults";
import { BUILTIN_SECTIONS } from "./builtinSections";

/**
 * The settings-section registry (spec 010 §Routes: the settings surface).
 *
 * **One registry, two readers**: the settings view renders it and the command
 * palette lists it, so a section cannot exist in one and not the other. The four
 * built-ins (Appearance, Typography, Server, Plugins) and a plugin's own section
 * are the same kind of row in the same map; M3.5 registers the built-ins here so
 * the palette lists them without a change and the surface names none of them.
 *
 * A malformed contribution is **refused**: never listed, recorded as a
 * `PluginFault` (area `settings`), the same rule `plugins/registry.ts` gives a
 * slot. A section that throws at render is the surface's own concern — see
 * `SettingsSectionBoundary`.
 *
 * **The built-in ids are reserved** (M4.9, spec 040 §Model: the plugin manager is a
 * settings section, not a slot). A contribution naming one is refused the same
 * inert way, under the `lockedArea` reason the slot registry already uses, so a
 * plugin cannot take the manager's own surface away. The built-ins are placed into
 * the map directly and never come through that check, which is why it takes no
 * `Actor` and does not learn about capabilities or trust.
 */

export type SettingsSection = {
	readonly id: string;
	readonly label: string;
	readonly component: ComponentType;
	/** Lower sorts first; without one a section keeps registration order. */
	readonly order?: number;
};

/**
 * The order a section that names none gets: **last**, after every ordered one
 * (M4.3's ruling — M3.5 measured the old default, which put a plugin section
 * above the built-in Typography section). A contribution belongs after the
 * built-ins registered before it.
 */
export const DEFAULT_SECTION_ORDER = NO_ORDER;

const byId = new Map<string, SettingsSection>();
const listeners = new Set<() => void>();
let snapshot: readonly SettingsSection[] = [];

/**
 * The ids a contribution may not take (M4.9): derived from the built-in table, so
 * the reserved set can never drift from the sections that actually exist — never a
 * second hand-typed list.
 */
const RESERVED_IDS: ReadonlySet<string> = new Set(BUILTIN_SECTIONS.map((section) => section.id));

/**
 * What a refusal returns: a callable handle, because the registry's callers dispose
 * a section's handle as a function, and a no-op, because a refused contribution was
 * never registered.
 */
const REFUSED_SECTION = (): void => {};

function sorted(): SettingsSection[] {
	return [...byId.values()].sort(compareByOrder);
}

function publish(): void {
	snapshot = sorted();
	for (const listener of [...listeners]) listener();
}

export function subscribeToSettingsSections(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The sections now; identity-stable so `useSyncExternalStore` settles. */
export function getSettingsSections(): readonly SettingsSection[] {
	return snapshot;
}

/**
 * Add or replace a section; returns a handle that removes exactly this one. A
 * contribution naming a built-in id, or a malformed one, is refused: the handle is
 * a no-op, a `PluginFault` records why, and the registry is untouched.
 */
export function registerSettingsSection(section: SettingsSection): () => void {
	const subject = typeof section?.id === "string" ? section.id : "?";
	if (RESERVED_IDS.has(subject)) {
		recordFault({
			area: FAULT_AREAS.settings,
			reason: FAULT_REASONS.lockedArea,
			subject,
			message: `the settings section "${subject}" is a built-in; a contribution cannot take it`,
		});
		return REFUSED_SECTION;
	}
	const problem = sectionProblem(section);
	if (problem !== null) {
		recordFault({
			area: FAULT_AREAS.settings,
			reason: FAULT_REASONS.malformedEntry,
			subject,
			message: `the settings section "${subject}" has ${problem}`,
		});
		return REFUSED_SECTION;
	}
	byId.set(section.id, section);
	publish();
	return () => {
		// A handle removes exactly the section it registered: a later registration
		// under this id is a different section, and disposing the old handle must
		// not take it away (the slot registry's contract).
		if (byId.get(section.id) !== section) return;
		byId.delete(section.id);
		publish();
	};
}

export function useSettingsSections(): readonly SettingsSection[] {
	return useSyncExternalStore(subscribeToSettingsSections, getSettingsSections);
}
for (const section of BUILTIN_SECTIONS) byId.set(section.id, section);
publish();

/** The tests' reset: the built-ins only, nothing a test registered. */
export function resetSettingsSections(): void {
	byId.clear();
	for (const section of BUILTIN_SECTIONS) byId.set(section.id, section);
	publish();
}

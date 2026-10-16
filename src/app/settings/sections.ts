import { type ComponentType, useSyncExternalStore } from "react";
import { sectionProblem } from "@/app/settings/sectionValidation";
import { AppearanceSection } from "@/components/AppearanceSection";
import { ConnectSection } from "@/components/ConnectSection";
import { PluginsSection } from "@/components/PluginsSection";
import { TypographySection } from "@/components/TypographySection";
import { APPEARANCE_TITLE } from "@/constants/appearance";
import { CONNECT_TITLE } from "@/constants/connect";
import { PLUGINS_TITLE } from "@/constants/plugins";
import { SETTINGS_SECTION_ID, SETTINGS_SECTION_ORDER } from "@/constants/settings";
import { TYPOGRAPHY_TITLE } from "@/constants/typography";
import { FAULT_AREAS, FAULT_REASONS, recordFault } from "@/plugins/faults";

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
 */

export type SettingsSection = {
	readonly id: string;
	readonly label: string;
	readonly component: ComponentType;
	/** Lower sorts first; without one a section keeps registration order. */
	readonly order?: number;
};

/** The order a section that names none gets. */
export const DEFAULT_SECTION_ORDER = 0;

const byId = new Map<string, SettingsSection>();
const listeners = new Set<() => void>();
let snapshot: readonly SettingsSection[] = [];

function sorted(): SettingsSection[] {
	return [...byId.values()].sort(
		(a, b) => (a.order ?? DEFAULT_SECTION_ORDER) - (b.order ?? DEFAULT_SECTION_ORDER),
	);
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

/** Add or replace a section; returns a handle that removes exactly this one. */
export function registerSettingsSection(section: SettingsSection): () => void {
	const problem = sectionProblem(section);
	if (problem !== null) {
		const subject = typeof section?.id === "string" ? section.id : "?";
		recordFault({
			area: FAULT_AREAS.settings,
			reason: FAULT_REASONS.malformedEntry,
			subject,
			message: `the settings section "${subject}" has ${problem}`,
		});
		return () => {
			// A refusal has nothing to retract, and the settings registry's handle is
			// callable (its callers dispose it as a function).
		};
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

/**
 * The built-ins the registry ships (M1.6, M3.2, M3.5). They are registered as
 * built-ins through the same map a plugin writes to, and in the row's own order —
 * Appearance, Typography, Server, Plugins — so the surface's order is one table
 * rather than a sequence of numbers spread across the registrations.
 */
const BUILTINS: readonly SettingsSection[] = [
	{
		id: SETTINGS_SECTION_ID.appearance,
		label: APPEARANCE_TITLE,
		component: AppearanceSection,
		order: SETTINGS_SECTION_ORDER.appearance,
	},
	{
		id: SETTINGS_SECTION_ID.typography,
		label: TYPOGRAPHY_TITLE,
		component: TypographySection,
		order: SETTINGS_SECTION_ORDER.typography,
	},
	{
		id: SETTINGS_SECTION_ID.connect,
		label: CONNECT_TITLE,
		component: ConnectSection,
		order: SETTINGS_SECTION_ORDER.connect,
	},
	{
		id: SETTINGS_SECTION_ID.plugins,
		label: PLUGINS_TITLE,
		component: PluginsSection,
		order: SETTINGS_SECTION_ORDER.plugins,
	},
];

for (const section of BUILTINS) byId.set(section.id, section);
publish();

/** The tests' reset: the built-ins only, nothing a test registered. */
export function resetSettingsSections(): void {
	byId.clear();
	for (const section of BUILTINS) byId.set(section.id, section);
	publish();
}

import { type ComponentType, useSyncExternalStore } from "react";
import { ConnectSection } from "@/components/ConnectSection";
import { CONNECT_TITLE } from "@/constants/connect";
import { SETTINGS_SECTION_ID } from "@/constants/settings";

/**
 * The settings-section registry (spec 010 §Routes: the settings surface).
 *
 * **One registry, two readers**: the settings view renders it and the command
 * palette lists it, so a section cannot exist in one and not the other. M3.5
 * adds Appearance/Typography/Plugins by `registerSettingsSection`, not by
 * editing a list in two places — which is why the palette must read this and not
 * a hardcoded array (M1.6 requirement 4).
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
	byId.set(section.id, section);
	publish();
	return () => {
		if (byId.get(section.id) !== section) return;
		byId.delete(section.id);
		publish();
	};
}

export function useSettingsSections(): readonly SettingsSection[] {
	return useSyncExternalStore(subscribeToSettingsSections, getSettingsSections);
}

/** The built-ins M1.6 ships; M3.5 grows the surface by registering alongside them. */
const BUILTINS: readonly SettingsSection[] = [
	{
		id: SETTINGS_SECTION_ID.connect,
		label: CONNECT_TITLE,
		component: ConnectSection,
		order: DEFAULT_SECTION_ORDER,
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

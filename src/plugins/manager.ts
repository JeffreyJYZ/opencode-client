import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import { APP_VERSION } from "@/constants/plugins";
import { clearFaultsFor } from "@/plugins/faults";
import {
	getInstalled,
	type InstalledPlugin,
	type InstallOutcome,
	installPlugin as installRecord,
	listInstalled,
	removeInstalled,
	setPluginEnabled,
	subscribeToInstalled,
} from "@/plugins/installed";
import { createLoader, type LoadOutcome } from "@/plugins/loader";

/**
 * The plugin manager (M4.5, spec 040 §Build, install, develop): **one** loader, the
 * installed-record store, and the four actions the settings section offers.
 *
 * Enable, reload and disable go through the loader and nowhere else, so a plugin's
 * contributions are retracted by the loader's own LIFO disposal and the row's state
 * is read back from the loader, never remembered here. Uninstall additionally drops
 * the record and the faults recorded against its id, so a removed plugin leaves
 * nothing behind.
 *
 * The loader gets the app's **own** React through the host globals (spec 040
 * §Entry file), so a plugin's `useState` is the app's instance, not a second copy.
 *
 * The master switch (`settings.pluginsEnabled`, spec 040 §Model) is not a settings
 * field yet, so `isEnabled` is `true` here and the per-plugin `enabled` flag is
 * what gates loading: nothing loads until a plugin is enabled, which is what "off
 * by default" means today. Wiring the switch is a later row's.
 */

const loader = createLoader({
	isEnabled: () => true,
	react: React,
	jsx: JsxRuntime,
	appVersion: APP_VERSION,
});

export type ManagerSnapshot = {
	readonly installed: readonly InstalledPlugin[];
	/** The ids whose `setup` has run and whose contributions are live. */
	readonly loaded: readonly string[];
};

let snapshot: ManagerSnapshot = { installed: [], loaded: [] };
const listeners = new Set<() => void>();
let booted = false;

function refresh(): void {
	snapshot = { installed: listInstalled(), loaded: loader.list() };
	for (const listener of [...listeners]) listener();
}

export function getPluginsSnapshot(): ManagerSnapshot {
	return snapshot;
}

export function subscribeToPlugins(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Validate and store a record; the loader is not touched until it is enabled. */
export function installPlugin(manifest: unknown, source: string): InstallOutcome {
	const outcome = installRecord(manifest, source);
	refresh();
	return outcome;
}

export async function enablePlugin(id: string): Promise<LoadOutcome | null> {
	const record = getInstalled(id);
	if (record === null) return null;
	setPluginEnabled(id, true);
	const outcome = await loader.load({ manifest: record.manifest, source: record.source });
	refresh();
	return outcome;
}

/** `false` when nothing was running under `id` — the loader's own contract. */
export function disablePlugin(id: string): boolean {
	const ran = loader.disable(id);
	setPluginEnabled(id, false);
	refresh();
	return ran;
}

export async function reloadPlugin(id: string): Promise<LoadOutcome | null> {
	const record = getInstalled(id);
	if (record === null) return null;
	const outcome = await loader.reload({ manifest: record.manifest, source: record.source });
	refresh();
	return outcome;
}

export function uninstallPlugin(id: string): void {
	loader.disable(id);
	removeInstalled(id);
	clearFaultsFor(id);
	refresh();
}

/**
 * The app's one boot call (from `main.tsx`, after the settings restore): subscribe
 * the snapshot to both stores, then load every plugin the user left enabled. A
 * refusal is a fault, not a throw, so a bad record cannot stop the others.
 */
export function startPluginManager(): void {
	hydrateAndSubscribe();
	for (const record of listInstalled()) {
		if (record.enabled) void loader.load({ manifest: record.manifest, source: record.source });
	}
	refresh();
}

function hydrateAndSubscribe(): void {
	if (booted) return;
	booted = true;
	loader.subscribe(refresh);
	subscribeToInstalled(refresh);
}

// The section reads the snapshot in a test too, where `startPluginManager` never
// runs: the subscriptions and one initial publish happen at import, and the boot
// call only adds the enabled-plugin loads.
hydrateAndSubscribe();
refresh();

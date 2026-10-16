import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import { getSettings } from "@/app/settings/store";
import { APP_VERSION } from "@/constants/plugins";
import { getAppPorts } from "@/plugins/appPorts";
import { clearFaultsFor } from "@/plugins/faults";
import { createHostFactory } from "@/plugins/host";
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
 * The plugin manager (M4.5, spec 040 §Build, install, develop): **one** loader,
 * the installed-record store, and the four actions the settings section offers.
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
 * The loader's master switch reads `settings.pluginsEnabled` **live** (spec 040
 * §Model: off by default), so nothing loads until the user turns it on, and the
 * per-plugin `enabled` flag still gates each plugin. Its host factory reads the
 * app's ports live too (`appPorts.ts`), so a plugin enabled while the app is
 * connected gets the real client and stream, not a null captured at import.
 */

export const loader = createLoader({
	isEnabled: () => getSettings().pluginsEnabled,
	createHost: (pluginId) => createHostFactory(getAppPorts())(pluginId),
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

export function refresh(): void {
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
 * Load every plugin the user has left enabled and that is not already running
 * (M4.10). Called when the app's ports arrive and when the master switch turns on
 * (both in `managerBoot.ts`), never on a timer: the guard is the loader's own
 * `list()`, so a repeat call loads nothing twice. A refusal is a fault, not a
 * throw, so a bad record cannot stop the others.
 */
export function loadEnabledPlugins(): void {
	const running = new Set(loader.list());
	for (const record of listInstalled()) {
		if (!record.enabled || running.has(record.manifest.id)) continue;
		void loader.load({ manifest: record.manifest, source: record.source });
	}
}

// The section reads the snapshot in a test too, where `startPluginManager` never
// runs: the subscriptions and one initial publish happen at import, and the boot
// call (`managerBoot.ts`) only hydrates the store and triggers the enabled loads.
loader.subscribe(refresh);
subscribeToInstalled(refresh);
refresh();

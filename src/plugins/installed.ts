import { PLUGIN_INSTALLED_KEY } from "@/constants/pluginManager";
import { APP_VERSION } from "@/constants/plugins";
import { FAULT_AREAS, FAULT_REASONS, recordFault } from "@/plugins/faults";
import { manifestSchema, type PluginManifest, parseManifest } from "@/plugins/manifest";

/**
 * The plugins installed in this app (M4.5, spec 040 §Build, install, develop).
 *
 * One record per plugin: the **validated** manifest, the built entry source and
 * whether the user has it enabled. A manifest is validated **at install** (spec
 * 040 §Manifest: "a bad id or an unknown capability fails at install, not at first
 * use"), so a refusal here records a `PluginFault` and stores nothing.
 *
 * It persists to `localStorage` — the app's own data, where the settings blob also
 * lives — and it holds the **source**, not a path: the loader imports an installed
 * plugin from a `Blob`, so the app never needs the plugin's files at run time. The
 * record is the manager's own; the loader knows nothing about it.
 */

export type InstalledPlugin = {
	readonly manifest: PluginManifest;
	readonly source: string;
	readonly enabled: boolean;
};

export type InstallOutcome =
	| { readonly ok: true; readonly id: string }
	| { readonly ok: false; readonly message: string };

let byId = new Map<string, InstalledPlugin>();
let snapshot: readonly InstalledPlugin[] = [];
const listeners = new Set<() => void>();

/** The browser's storage, or `null` where there is none (a DOM-less test). */
function store(): Storage | null {
	return typeof localStorage === "undefined" ? null : localStorage;
}

function publish(): void {
	snapshot = [...byId.values()];
	const target = store();
	if (target !== null) target.setItem(PLUGIN_INSTALLED_KEY, JSON.stringify(snapshot));
	for (const listener of [...listeners]) listener();
}

/** A stored record, checked the way this writer produces it; a bad one is dropped. */
function readRecord(value: unknown): InstalledPlugin | null {
	if (typeof value !== "object" || value === null) return null;
	const record = value as Record<string, unknown>;
	const parsed = manifestSchema.safeParse(record.manifest);
	if (!parsed.success) return null;
	if (typeof record.source !== "string" || record.source.trim() === "") return null;
	return { manifest: parsed.data, source: record.source, enabled: record.enabled === true };
}

/**
 * Read the persisted records. Called at boot by `startPluginManager`; a blob this
 * build cannot parse is ignored rather than fatal, and the next write replaces it.
 */
export function hydrateInstalled(storage: Storage | null = store()): void {
	byId = new Map();
	if (storage !== null) {
		try {
			const raw = storage.getItem(PLUGIN_INSTALLED_KEY);
			const list = raw === null ? [] : JSON.parse(raw);
			if (Array.isArray(list)) {
				for (const entry of list) {
					const record = readRecord(entry);
					if (record !== null) byId.set(record.manifest.id, record);
				}
			}
		} catch {
			// Unreadable: start empty, and let the next install overwrite the key.
		}
	}
	snapshot = [...byId.values()];
	for (const listener of [...listeners]) listener();
}

export function listInstalled(): readonly InstalledPlugin[] {
	return snapshot;
}

export function getInstalled(id: string): InstalledPlugin | null {
	return byId.get(id) ?? null;
}

export function subscribeToInstalled(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** Validate the manifest and store the record, **disabled** (spec 040: off by default). */
export function installPlugin(manifest: unknown, source: string): InstallOutcome {
	const parsed = parseManifest(manifest, APP_VERSION);
	if (!parsed.ok) {
		recordFault({
			area: FAULT_AREAS.plugins,
			reason: parsed.problem.reason,
			subject: parsed.problem.subject,
			message: parsed.problem.message,
		});
		return { ok: false, message: parsed.problem.message };
	}
	const id = parsed.manifest.id;
	if (typeof source !== "string" || source.trim() === "") {
		const message = `the entry for "${id}" is empty`;
		recordFault({
			area: FAULT_AREAS.plugins,
			reason: FAULT_REASONS.malformedEntry,
			subject: id,
			message,
		});
		return { ok: false, message };
	}
	byId.set(id, { manifest: parsed.manifest, source, enabled: false });
	publish();
	return { ok: true, id };
}

export function setPluginEnabled(id: string, enabled: boolean): void {
	const record = byId.get(id);
	if (record === undefined || record.enabled === enabled) return;
	byId.set(id, { ...record, enabled });
	publish();
}

export function removeInstalled(id: string): void {
	if (!byId.delete(id)) return;
	publish();
}

/** The tests' reset; production never calls it. */
export function resetInstalled(): void {
	byId = new Map();
	snapshot = [];
	store()?.removeItem(PLUGIN_INSTALLED_KEY);
	for (const listener of [...listeners]) listener();
}

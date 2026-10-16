import { APP_EVENT, APP_VERSION } from "@/constants/plugins";
import { emitAppEvent } from "@/plugins/appEvents";
import type { ModuleImporter } from "@/plugins/blobModule";
import { installRuntimeGlobals } from "@/plugins/globals";
import { createHostFactory, type HostFactory } from "@/plugins/host";
import type { PluginInstance } from "@/plugins/instance";
import { prepare, start } from "@/plugins/loadSteps";

/**
 * The plugin loader (spec 040 §Entry file, §Build, install, develop, §The host).
 *
 * It validates a manifest, imports the built entry from a **Blob** — the
 * production path — checks the host globals, runs `setup` and keeps the handle it
 * returns. Nothing is imported while plugins are off, and a refusal is inert plus
 * a `PluginFault`, never a throw.
 *
 * An activation is **two-phase**: the new source is validated and imported first,
 * then the instance already running under that id is disposed, then the new
 * `setup` runs — so a reload whose new source is refused leaves the old instance
 * running untouched.
 *
 * The loader is where `plugin-loaded` and `plugin-unloaded` fire (M4.14): an
 * instance's `setup` returning and its `dispose` running are the two moments, and a
 * reload emits both — the old instance unloaded, the new one loaded.
 */

export type PluginRequest = {
	readonly manifest: unknown;
	readonly source: string;
};

export type LoadStatus = "loaded" | "off" | "refused";

export type LoadOutcome = {
	readonly status: LoadStatus;
	/** The plugin the outcome is about; `null` while plugins are off. */
	readonly id: string | null;
	readonly warnings: readonly string[];
};

export type LoaderOptions = {
	/** The master switch (spec 040: off by default). Read on every activation. */
	readonly isEnabled: () => boolean;
	/** How a plugin's host is built (M4.3); one host per plugin, never shared. */
	readonly createHost?: HostFactory;
	readonly react: unknown;
	readonly jsx: unknown;
	readonly appVersion?: string;
	/** Test seam; the default imports the Blob URL for real. */
	readonly importModule?: ModuleImporter;
};

export type Loader = {
	/** Validate, import and start; an instance already under that id is replaced. */
	load(request: PluginRequest): Promise<LoadOutcome>;
	/** The same two-phase path, under the manager's name for a running plugin. */
	reload(request: PluginRequest): Promise<LoadOutcome>;
	/** Dispose every handle the plugin kept; `false` when nothing ran under `id`. */
	disable(id: string): boolean;
	/** The ids loaded now, in load order. */
	list(): readonly string[];
	subscribe(listener: () => void): () => void;
};

const OFF: LoadOutcome = { status: "off", id: null, warnings: [] };
const LOADED = "loaded";

export function createLoader(options: LoaderOptions): Loader {
	const running = new Map<string, PluginInstance>();
	const listeners = new Set<() => void>();
	const steps = {
		createHost: options.createHost ?? createHostFactory(),
		appVersion: options.appVersion ?? APP_VERSION,
		importModule: options.importModule,
	};
	installRuntimeGlobals({ react: options.react, jsx: options.jsx });

	function notify(): void {
		for (const listener of [...listeners]) listener();
	}

	function retire(id: string): void {
		const instance = running.get(id);
		if (instance === undefined) return;
		instance.dispose();
		running.delete(id);
		emitAppEvent(APP_EVENT.pluginUnloaded, { id });
	}

	async function activate(request: PluginRequest): Promise<LoadOutcome> {
		if (!options.isEnabled()) return OFF;
		const prepared = await prepare(request, steps);
		if (!prepared.ok) return prepared.outcome;
		const { id } = prepared.prepared;
		retire(id);
		const started = start(prepared.prepared);
		if (!started.ok) return started.outcome;
		running.set(id, started.instance);
		emitAppEvent(APP_EVENT.pluginLoaded, { id });
		notify();
		return { status: LOADED, id, warnings: prepared.prepared.warnings };
	}

	return {
		load: activate,
		reload: activate,
		disable(id: string): boolean {
			if (!running.has(id)) return false;
			retire(id);
			notify();
			return true;
		},
		list: () => [...running.keys()],
		subscribe(listener: () => void): () => void {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

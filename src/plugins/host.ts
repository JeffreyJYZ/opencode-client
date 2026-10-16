import { APP_VERSION, HOST_API_VERSION } from "@/constants/plugins";
import { onAppEvent } from "@/plugins/appEvents";
import type { Disposable } from "@/plugins/disposable";
import { createHostRegistries } from "@/plugins/hostRegistries";
import { createInstance, type PluginInstance } from "@/plugins/instance";
import { PLUGIN_KIT, type PluginKit } from "@/plugins/kit";
import { createLogger } from "@/plugins/logs";
import type { Actor } from "@/plugins/registry";
import type { Host } from "@/plugins/sdk";
import { createPluginNative, type NativeFs } from "@/plugins/services/native";
import { createPluginNotify, type PluginNotifier } from "@/plugins/services/notify";
import { createPluginOpenCode, type PluginEventSource } from "@/plugins/services/opencode";
import {
	createMemoryStorageBackend,
	createPluginStorage,
	type PluginStorageBackend,
} from "@/plugins/services/storage";
import { createPluginTranscript } from "@/plugins/services/transcript";
import type { OpenCodeClient } from "@/session/client";
import type { Transcript } from "@/session/transcript";

/**
 * **The one host API** (spec 040 §The host): `createHostFactory` builds a `Host`
 * per plugin, and every registry it exposes is the same function a built-in calls
 * — `ui.register` is the slot registry's `register`, `settings.registerSection` is
 * the settings registry's, `themes.register` is the theme service's. A built-in
 * and a plugin therefore have one registration path, and the only difference is
 * the `Actor` the host passes: a plugin's id, which is what makes the two locked
 * areas a check rather than a convention. The registries themselves are
 * `hostRegistries.ts`; this file is the factory, the lifetime and the services.
 *
 * Every contribution and every unsubscribe is added to the plugin's
 * `PluginInstance`, so disabling a plugin runs one LIFO disposal that retracts
 * everything it contributed. The host's own teardown (the `signal` abort) is added
 * **first**, so it runs last — after the contributions are gone.
 *
 * The dependencies are ports: the app supplies the client, the event source, the
 * transcript getter, the filesystem and the notifier; a host built with none of
 * them is complete and inert, which is what the tests and the default loader use.
 */

export type NativeDeps = {
	readonly fs: NativeFs;
	readonly dataRoot: string;
	readonly openExternal?: (url: string) => void;
	readonly pickDirectory?: (defaultPath?: string) => Promise<string | null>;
};

export type HostDeps = {
	readonly kit?: PluginKit;
	readonly storage?: PluginStorageBackend;
	readonly native?: NativeDeps;
	readonly client?: OpenCodeClient | null;
	readonly subscribe?: PluginEventSource;
	/** The open session's transcript, or `undefined` when none is open. */
	readonly transcript?: () => Transcript | undefined;
	readonly notifier?: PluginNotifier;
	/** Test seam: how an instance is built. */
	readonly instanceFor?: (pluginId: string) => PluginInstance;
};

export type PluginHost = {
	readonly host: Host;
	readonly instance: PluginInstance;
};

export type HostFactory = (pluginId: string) => PluginHost;

export function createHostFactory(deps: HostDeps = {}): HostFactory {
	const backend = deps.storage ?? createMemoryStorageBackend();
	const makeInstance = deps.instanceFor ?? createInstance;
	const opencodeDeps = { client: deps.client ?? null, subscribe: deps.subscribe };
	const nativeDeps = deps.native;

	return function createHost(pluginId: string): PluginHost {
		const instance = makeInstance(pluginId);
		const controller = new AbortController();
		// Added first, so it runs LAST: the contributions are retracted before the
		// signal aborts, and a teardown that reacts to the abort cannot race a
		// registry the plugin no longer owns.
		instance.add({ dispose: () => controller.abort() });

		function track(disposable: Disposable): Disposable {
			instance.add(disposable);
			return disposable;
		}

		const actor: Actor = { pluginId };
		const opencode = createPluginOpenCode(opencodeDeps);

		const host: Host = {
			version: Object.freeze({ app: APP_VERSION, api: HOST_API_VERSION }),
			signal: controller.signal,
			...createHostRegistries({ track, actor, kit: deps.kit ?? PLUGIN_KIT }),
			opencode: {
				client: opencode.client,
				on: (event, handler) => {
					const off = opencode.on(event, handler);
					track({ dispose: off });
					return off;
				},
			},
			transcript: createPluginTranscript(deps.transcript ?? (() => undefined)),
			storage: createPluginStorage({ pluginId, backend }),
			native:
				nativeDeps === undefined ? null : createPluginNative({ pluginId, ...nativeDeps }),
			notify: createPluginNotify(deps.notifier),
			log: createLogger(pluginId),
			on: (event, handler) => {
				const off = onAppEvent(event, handler);
				track({ dispose: off });
				return off;
			},
		};

		return { host, instance };
	};
}

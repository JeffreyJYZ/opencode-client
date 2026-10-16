import { currentRoute } from "@/app/router";
import { pushToast } from "@/components/toast/toastStore";
import { TOAST_ROLE, type ToastRole } from "@/constants/native";
import { ROUTE_KIND } from "@/constants/routes";
import { openExternalUrl } from "@/native/openExternal";
import { defaultDirectoryPicker } from "@/native/pickDirectory";
import { createNativeFs, pluginDataRoot } from "@/native/pluginFs";
import type { HostDeps } from "@/plugins/host";
import type { NativeFs } from "@/plugins/services/native";
import {
	PLUGIN_NOTICE_KIND,
	type PluginNoticeKind,
	type PluginNotifier,
} from "@/plugins/services/notify";
import { createLocalStorageBackend } from "@/plugins/services/storageBackend";
import type { OpenCodeClient } from "@/session/client";
import { subscribeToServerEvents } from "@/session/serverEvents";
import type { TranscriptStore } from "@/session/transcriptStore";

/**
 * The app's host ports (M4.10, spec 040 §The host): turn the live client bundle
 * into the `HostDeps` the loader builds a plugin's host from. This is the
 * **app-side** half of the wiring; `src/plugins/appPorts.ts` is the holder the
 * loader reads.
 *
 * Every dep here is the app's own object, not a stand-in:
 * - `client` is the bundle's one `OpenCodeClient`, `null` when no target resolved.
 * - `subscribe` is the app's single event stream, fanned out (`serverEvents.ts`).
 * - `transcript` reads the **open session** synchronously from the route and the
 *   bundle's store, so a plugin gets what is rendered now.
 * - `storage` is the persisted `localStorage` backend.
 * - `notifier.show` is the app's toast host.
 * - `native` is the shell's filesystem (M4.11): `fs` is the Tauri adapter
 *   (`createNativeFs`), `dataRoot` is the shell's app data root
 *   (`pluginDataRoot`), and `openExternal` / `pickDirectory` are the app's own
 *   seams. The host scopes every path to the plugin's own
 *   `plugin-data/<id>/` (`createPluginNative`), so this is the **real** bridge,
 *   not a stub. It is **absent** — which the host turns into `native === null` —
 *   only where there is no shell: the web build and the test process, where
 *   `pluginDataRoot()` answers `null`.
 *
 * `kit` is not overridden: the host factory's own `PLUGIN_KIT` (empty) is what a
 * host built here gets, so `host.ui.kit` stays empty until a row supplies one.
 */

/** A notice kind's ARIA role: a toast/banner is `status`, a modal is `alert`. */
const NOTICE_ROLE: Readonly<Record<PluginNoticeKind, ToastRole>> = {
	[PLUGIN_NOTICE_KIND.toast]: TOAST_ROLE.status,
	[PLUGIN_NOTICE_KIND.banner]: TOAST_ROLE.status,
	[PLUGIN_NOTICE_KIND.modal]: TOAST_ROLE.alert,
};

/**
 * The app's notifier: `show` draws through the toast host. `confirm` has no
 * chrome in this build, so it resolves `false` — the host's documented
 * "a dialog nobody drew" answer, not a hang.
 */
export const TOAST_NOTIFIER: PluginNotifier = {
	show: (notice) => {
		pushToast(notice.message, NOTICE_ROLE[notice.kind]);
	},
	confirm: async () => false,
};

export type HostPortInput = {
	readonly client: OpenCodeClient | null;
	readonly transcripts: TranscriptStore;
	/**
	 * The app data root `native` scopes to. Production leaves it out so it is read
	 * from the shell; `null` means "no shell, no `native`". The test seam.
	 */
	readonly nativeRoot?: string | null;
	/** The filesystem behind `native`; production uses the Tauri adapter. Test seam. */
	readonly nativeFs?: NativeFs;
};

export async function buildHostPorts(input: HostPortInput): Promise<HostDeps> {
	const root = input.nativeRoot === undefined ? await pluginDataRoot() : input.nativeRoot;
	return {
		client: input.client,
		subscribe: subscribeToServerEvents,
		transcript: () => {
			const route = currentRoute();
			return route.kind === ROUTE_KIND.session ? input.transcripts.get(route.id) : undefined;
		},
		storage: createLocalStorageBackend(),
		notifier: TOAST_NOTIFIER,
		native:
			root === null || root === undefined
				? undefined
				: {
						fs: input.nativeFs ?? createNativeFs(),
						dataRoot: root,
						openExternal: (url: string) => {
							void openExternalUrl(url);
						},
						pickDirectory: defaultDirectoryPicker,
					},
	};
}

import { APP_KIT } from "@/app/hostKit";
import { currentRoute } from "@/app/router";
import { pushBanner } from "@/components/notify/bannerStore";
import { pushModal, requestConfirm } from "@/components/notify/modalStore";
import { pushToast } from "@/components/toast/toastStore";
import { TOAST_ROLE } from "@/constants/native";
import { ROUTE_KIND } from "@/constants/routes";
import { openExternalUrl } from "@/native/openExternal";
import { defaultDirectoryPicker } from "@/native/pickDirectory";
import { createNativeFs, pluginDataRoot } from "@/native/pluginFs";
import type { HostDeps } from "@/plugins/host";
import type { NativeFs } from "@/plugins/services/native";
import { PLUGIN_NOTICE_KIND, type PluginNotifier } from "@/plugins/services/notify";
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
 * - `notifier` is the app's notice sinks (`APP_NOTIFIER`): `toast`, `banner` and
 *   `modal` each reach their own chrome, and `confirm` opens the modal and
 *   resolves the answer the user gives.
 * - `native` is the shell's filesystem (M4.11): `fs` is the Tauri adapter
 *   (`createNativeFs`), `dataRoot` is the shell's app data root
 *   (`pluginDataRoot`), and `openExternal` / `pickDirectory` are the app's own
 *   seams. The host scopes every path to the plugin's own
 *   `plugin-data/<id>/` (`createPluginNative`), so this is the **real** bridge,
 *   not a stub. It is **absent** — which the host turns into `native === null` —
 *   only where there is no shell: the web build and the test process, where
 *   `pluginDataRoot()` answers `null`.
 *
 * `kit` is the app's real kit (M4.21, `app/hostKit.ts`): the six primitives
 * the app itself renders, frozen. A host built anywhere else gets the
 * factory's own `PLUGIN_KIT` (empty).
 */

/**
 * The app's notifier (M4.20): each kind reaches **its own** sink — a toast that
 * self-dismisses, a banner that persists until dismissed, and a modal dialog —
 * and `confirm` opens that dialog and resolves **the answer the user gives**,
 * never a constant. A toast's role is the app's own (`TOAST_ROLE`); the banner's
 * and the modal's are named in `constants/notify.ts`, so no kind is flattened
 * into another.
 */
export const APP_NOTIFIER: PluginNotifier = {
	show: (notice) => {
		switch (notice.kind) {
			case PLUGIN_NOTICE_KIND.banner:
				pushBanner(notice.message);
				return;
			case PLUGIN_NOTICE_KIND.modal:
				pushModal(notice.message);
				return;
			default:
				pushToast(notice.message, TOAST_ROLE.status);
		}
	},
	confirm: (message) => requestConfirm(message),
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
		notifier: APP_NOTIFIER,
		kit: APP_KIT,
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

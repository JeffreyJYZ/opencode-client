import { currentRoute } from "@/app/router";
import { pushToast } from "@/components/toast/toastStore";
import { TOAST_ROLE, type ToastRole } from "@/constants/native";
import { ROUTE_KIND } from "@/constants/routes";
import type { HostDeps } from "@/plugins/host";
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
 *
 * `native` is deliberately **absent**: the M5.2 bridge (`src/native/`) exposes
 * `openExternal`, `pickDirectory`, clipboard and notifications but **no**
 * filesystem commands and **no** data root, and `NativeDeps` requires both, so a
 * host built here has `native === null` — visible and inert, never a stub that
 * looks alive. `kit` is likewise left out (the app's React primitives are M4.11's).
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
};

export function buildHostPorts(input: HostPortInput): HostDeps {
	return {
		client: input.client,
		subscribe: subscribeToServerEvents,
		transcript: () => {
			const route = currentRoute();
			return route.kind === ROUTE_KIND.session ? input.transcripts.get(route.id) : undefined;
		},
		storage: createLocalStorageBackend(),
		notifier: TOAST_NOTIFIER,
	};
}

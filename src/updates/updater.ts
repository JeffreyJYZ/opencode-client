import { isTauri } from "@tauri-apps/api/core";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import type { DownloadProgress } from "@/updates/progress";
import type { UpdateOffer, UpdateSeam } from "@/updates/seam";

/**
 * The self-update boundary (M5.6). The **flow** lives in `src/updates/store.ts`;
 * this module is the only place that knows the Tauri updater exists.
 *
 * The seam is injectable because the page's own test environment has no shell:
 * happy-dom has no `window.__TAURI_INTERNALS__`, so a real check would reach for
 * an IPC channel that is not there. A test replaces the seam and never touches
 * the plugin — the same shape as the injected image reader in the composer.
 *
 * The plugin's own `Update` handle is **not** thrown away: the check carries the
 * offer it produced, so an offer can actually be installed. That was the gap
 * M5.6 names.
 */

/** The Tauri updater's own handle, which only this module names. */
type TauriOffer = UpdateOffer & { readonly handle: Update };

/** The plugin's events, as the byte counts the flow counts. */
function toProgress(event: DownloadEvent, running: DownloadProgress): DownloadProgress {
	if (event.event === "Started") {
		return { received: 0, total: event.data.contentLength ?? null };
	}
	if (event.event === "Progress") {
		return { received: running.received + event.data.chunkLength, total: running.total };
	}
	return running;
}

/**
 * The Tauri updater, as a seam. The plugin is configured entirely by the
 * `plugins.updater` block of `tauri.conf.json` (endpoint and public key), so
 * nothing here names a url.
 */
export const tauriSeam: UpdateSeam = {
	isSupported: () => isTauri(),
	async check(): Promise<UpdateOffer | null> {
		const handle = await check();
		if (handle === null) return null;
		// The plugin's own handle rides along, so the flow can install the offer it
		// was handed. The cast is the one place the plugin's type crosses the seam.
		return {
			version: handle.version,
			release: () => {
				void handle.close().catch(() => undefined);
			},
			handle,
		} as TauriOffer;
	},
	async downloadAndInstall(
		offer: UpdateOffer,
		onProgress: (progress: DownloadProgress) => void,
	): Promise<void> {
		const { handle } = offer as TauriOffer;
		let running: DownloadProgress = { received: 0, total: null };
		await handle.downloadAndInstall((event) => {
			running = toProgress(event, running);
			onProgress(running);
		});
	},
	relaunch: () => relaunch(),
};

/**
 * The seam in force: the Tauri updater, unless a test replaced it. The app
 * never calls the setter — it is the injection point the tests use, so no test
 * ever calls the real plugin.
 */
let seam: UpdateSeam = tauriSeam;

/** The seam the flow drives now. */
export function currentUpdateSeam(): UpdateSeam {
	return seam;
}

/**
 * Whether this build can update at all: a de[REDACTED]top app can, a web build
 * cannot. It is a fact about the *environment*, not a phase of the flow, so it
 * lives with the seam rather than in the store's state.
 */
export function updatesSupported(): boolean {
	return seam.isSupported();
}

/** Replace the seam (the tests' seam). */
export function setUpdateSeam(next: UpdateSeam): void {
	seam = next;
}

/** Put the Tauri seam back (the tests' reset). */
export function resetUpdateSeam(): void {
	seam = tauriSeam;
}

/** The result of one check, in the shape the flow reads. */
export type UpdateCheck =
	| { readonly kind: "unsupported" }
	| { readonly kind: "current" }
	| {
			readonly kind: "available";
			readonly version: string;
			/** The offer that installs it — carried, not discarded. */
			readonly offer: UpdateOffer;
	  }
	| { readonly kind: "failed" };

/**
 * A[REDACTED] the updater what is available.
 *
 * A check that cannot run is a **state, not an error**: the web build has no
 * updater at all, and a de[REDACTED]top build with no release host answers with
 * nothing. So this never throws — a failed check is reported and changes
 * nothing.
 */
export async function checkForUpdate(seam: UpdateSeam = tauriSeam): Promise<UpdateCheck> {
	if (!seam.isSupported()) return { kind: "unsupported" };
	try {
		const offer = await seam.check();
		if (offer === null) return { kind: "current" };
		return { kind: "available", version: offer.version, offer };
	} catch {
		return { kind: "failed" };
	}
}

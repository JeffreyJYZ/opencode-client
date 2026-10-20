import type { DownloadProgress } from "@/updates/progress";
import type { UpdateOffer, UpdateSeam } from "@/updates/seam";
import { resetUpdateStore } from "@/updates/store";
import { resetUpdateSeam } from "@/updates/updater";

/**
 * The update flow's test fixtures (M5.6): a fake offer, a fake seam, and the
 * reset that puts both back.
 *
 * The seam is what the tests replace, so no test ever calls the real plugin —
 * happy-dom has no shell, and a real check would reach for an IPC channel that
 * is not there. Shared here so the store's suite and the components' suites
 * agree on what a fake is.
 */

/** Put the flow and its seam back, so one test cannot answer another's question. */
export function resetUpdateFlow(): void {
	resetUpdateStore();
	resetUpdateSeam();
}

/** An offer that records whether it was released. */
export function fakeOffer(version: string): UpdateOffer & { readonly released: () => number } {
	let releases = 0;
	return {
		version,
		release: () => {
			releases += 1;
		},
		released: () => releases,
	};
}

/** A seam whose check answers with `offer` (or `null` for "current"). */
export function fakeSeam(options: {
	readonly offer?: UpdateOffer | null;
	readonly supported?: boolean;
	readonly progress?: DownloadProgress[];
	readonly failInstall?: boolean;
	readonly failRelaunch?: boolean;
}): UpdateSeam & { readonly relaunched: () => number } {
	let relaunches = 0;
	return {
		isSupported: () => options.supported ?? true,
		check: () => Promise.resolve(options.offer ?? null),
		downloadAndInstall: async (_offer, report) => {
			for (const progress of options.progress ?? []) report(progress);
			if (options.failInstall === true) throw new Error("download failed");
		},
		relaunch: () => {
			relaunches += 1;
			if (options.failRelaunch === true) return Promise.reject(new Error("no restart"));
			return Promise.resolve();
		},
		relaunched: () => relaunches,
	};
}

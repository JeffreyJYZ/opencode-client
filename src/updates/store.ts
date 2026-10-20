import { maySurfaceVersion, rememberDismissedVersion } from "@/app/settings/updateDismissal";
import { UPDATE_INSTALL_FAILED_TEXT, UPDATE_RELAUNCH_FAILED_TEXT } from "@/constants/updates";
import { installOffer } from "@/updates/install";
import type { UpdateOffer } from "@/updates/seam";
import { checkForUpdate, currentUpdateSeam } from "@/updates/updater";

/**
 * The update flow's one store (M5.6). It owns the **phase machine**, and every
 * surface — the startup notice and the Settings section — reads and drives this
 * one store, so there is never a second check loop and never a second download
 * path.
 *
 * The phases are the reference implementation's (`ai-client-oss`), minus its
 * Effect runtime: `idle | checking | current | available | downloading | failed`.
 * A call while `checking` or `downloading` is a **no-op**: the flow is already
 * running, and a second one would race it.
 */

export type UpdatePhase = "idle" | "checking" | "current" | "available" | "downloading" | "failed";

export type UpdateState = {
	readonly phase: UpdatePhase;
	/** The version on offer, when there is one. */
	readonly version: string | null;
	/** The download's share, 0–100, or `null` while the total is unknown. */
	readonly percent: number | null;
	/** Why the flow failed, in the app's words. */
	readonly message: string | null;
};

const INITIAL: UpdateState = { phase: "idle", version: null, percent: null, message: null };

let state: UpdateState = INITIAL;
/** The offer being installed — the handle the flow keeps alive. */
let offer: UpdateOffer | null = null;
const listeners = new Set<() => void>();

function publish(next: Partial<UpdateState>): void {
	state = { ...state, ...next };
	for (const listener of [...listeners]) listener();
}

/** The flow's state now. */
export function getUpdateState(): UpdateState {
	return state;
}

/** Subscribe to the flow's state; the returned function unsubscribes. */
export function subscribeUpdateState(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/**
 * Check for a newer release.
 *
 * The check is **silent on failure**: a failed check leaves the flow where it
 * was rather than raising anything the user must dismiss, because a startup
 * check that cannot reach the release host is not the user's problem. Only a
 * real offer changes what is on screen.
 */
export async function checkForUpdates(): Promise<void> {
	if (state.phase === "checking" || state.phase === "downloading") return;
	const before = state;
	publish({ phase: "checking", version: null, percent: null, message: null });
	const result = await checkForUpdate(currentUpdateSeam());
	if (result.kind === "available") {
		// A version the user already dismissed stays dismissed — but only that
		// version: a newer release still surfaces.
		if (!maySurfaceVersion(result.version)) {
			publish({ phase: "current", version: null, percent: null, message: null });
			return;
		}
		offer = result.offer;
		publish({ phase: "available", version: result.version, percent: null, message: null });
		return;
	}
	if (result.kind === "current" || result.kind === "unsupported") {
		// A build that cannot update offers nothing — the web build shows its
		// version only (spec 010 §De[REDACTED]top behaviours).
		publish({ phase: "current", version: null, percent: null, message: null });
		return;
	}
	// A failed check changes nothing: the flow returns to where it was, and the
	// failure is not shown.
	publish(before);
}

/**
 * Install the offered release: download it, install it, and relaunch so the new
 * build runs.
 *
 * A failed install is a **message**, never a throw: the flow reports what went
 * wrong and stops, and the percent goes back to `null` rather than freezing on
 * the last number it reached.
 */
export async function installUpdate(): Promise<void> {
	if (state.phase !== "available" || offer === null) return;
	const installing = offer;
	publish({ phase: "downloading", percent: null, message: null });
	const outcome = await installOffer(currentUpdateSeam(), installing, (percent) => {
		publish({ phase: "downloading", percent, message: null });
	});
	if (outcome.kind === "install-failed") {
		publish({ phase: "failed", percent: null, message: UPDATE_INSTALL_FAILED_TEXT });
		return;
	}
	offer = null;
	if (outcome.kind === "relaunch-failed") {
		publish({
			phase: "failed",
			version: null,
			percent: null,
			message: UPDATE_RELAUNCH_FAILED_TEXT,
		});
		return;
	}
	// The app is restarting under the new build, so the flow has nothing left to
	// say — and the phase must leave `downloading`, or every later check would be
	// refused as "one is already running".
	publish({ phase: "idle", version: null, percent: null, message: null });
}

/**
 * Dismiss the offer: remember the version, so it is not offered again, and
 * release the handle it held.
 *
 * A dismissal while the install is running is refused: the handle is in flight,
 * and releasing it mid-download would take the download down with it.
 */
export function dismissUpdate(): void {
	if (state.phase === "downloading") return;
	if (state.version !== null) rememberDismissedVersion(state.version);
	const held = offer;
	offer = null;
	publish({ phase: "idle", version: null, percent: null, message: null });
	if (held !== null) held.release();
}

/** The tests' reset: the idle flow again, so one test's phase cannot answer the next. */
export function resetUpdateStore(): void {
	state = INITIAL;
	offer = null;
	for (const listener of [...listeners]) listener();
}

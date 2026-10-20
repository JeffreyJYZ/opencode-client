import { percentOf } from "@/updates/progress";
import type { UpdateOffer, UpdateSeam } from "@/updates/seam";

/**
 * The install procedure (M5.6): download the offered release, install it, and
 * relaunch so the new build runs.
 *
 * It is its own module because it is a *procedure*, not a state: the store owns
 * the phases and is told what happened. Nothing here knows what a phase is.
 */

/** What the install did. */
export type InstallOutcome =
	| { readonly kind: "installed" }
	/** The download or the install did not finish. */
	| { readonly kind: "install-failed" }
	/** The install finished, but the app did not come back up. */
	| { readonly kind: "relaunch-failed" };

/**
 * Install the offer, reporting the download's progress as it goes.
 *
 * A failure is an **outcome**, never a throw: the flow turns it into a
 * message, and the percent it reached is not left on the screen.
 */
export async function installOffer(
	seam: UpdateSeam,
	offer: UpdateOffer,
	onProgress: (percent: number | null) => void,
): Promise<InstallOutcome> {
	try {
		await seam.downloadAndInstall(offer, (progress) => {
			onProgress(percentOf(progress));
		});
	} catch {
		return { kind: "install-failed" };
	}
	try {
		await seam.relaunch();
	} catch {
		return { kind: "relaunch-failed" };
	}
	return { kind: "installed" };
}

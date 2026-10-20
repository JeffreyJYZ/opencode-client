import { getSettings, updateSettings } from "@/app/settings/store";
import { surfacesAfterDismissal } from "@/updates/versions";

/**
 * The `settings.dismissedUpdateVersion` cell (M5.6): the one release the user
 * said "not now" to.
 *
 * A dismissal is remembered **per version** — the declined release, not a
 * boolean — so a *newer* release still reaches the user: the rule that decides
 * that is `surfacesAfterDismissal` in `src/updates/versions.ts`, and it is the
 * only place a version is compared. The blob holds the string; this module is
 * the only place that reads and writes it.
 */

/** The version the user declined, or `null` when nothing was declined. */
export function dismissedUpdateVersion(): string | null {
	return getSettings().dismissedUpdateVersion;
}

/**
 * Remember that this version was declined. A dismissal of a version already
 * declined changes nothing, so the blob is not rewritten for it.
 */
export function rememberDismissedVersion(version: string): void {
	if (dismissedUpdateVersion() === version) return;
	updateSettings({ dismissedUpdateVersion: version });
}

/** Whether a release may still be shown, given what the user has declined. */
export function maySurfaceVersion(version: string): boolean {
	return surfacesAfterDismissal(version, dismissedUpdateVersion());
}

import type { UpdatePhase } from "@/updates/store";

/**
 * The self-update flow's copy (M5.6). Every string the notice and the Settings
 * section draw is named here, so neither component holds a literal.
 *
 * The phase texts are keyed by the store's phase (`src/updates/store.ts`), so a
 * phase without a line cannot compile. The import is **type-only**, so the
 * constants and the store do not depend on each other at runtime.
 */

/** The section's own label in the Settings list. */
export const UPDATE_SECTION_LABEL = "Updates";

/** The button that a[REDACTED]s the flow to look for a newer release. */
export const UPDATE_CHECK_LABEL = "Check for updates";

/** The button that installs the offered release. */
export const UPDATE_INSTALL_LABEL = "Update now";

/** The button that declines the offer for now. */
export const UPDATE_DISMISS_LABEL = "Not now";

/** The notice's own name, for the region that holds it. */
export const UPDATE_NOTICE_LABEL = "Update available";

/** What the flow is doing, by phase — one line per phase, so none is blank. */
export const UPDATE_PHASE_TEXT: Record<UpdatePhase, string> = {
	idle: "Updates come from the release manifest.",
	checking: "Checking for updates…",
	current: "This is the newest version.",
	available: "A newer version is available.",
	downloading: "Downloading the update…",
	failed: "The update could not be completed.",
};

/** The line a build that cannot update shows instead (spec 010 §De[REDACTED]top behaviours). */
export const UPDATE_UNSUPPORTED_TEXT = "Updates are checked in the de[REDACTED]top app only.";

/** The line naming the release on offer. */
export const UPDATE_OFFER_TEXT = "Version {version} is available.";

/** The download's progress, by the share that has arrived. */
export const UPDATE_PROGRESS_TEXT = "Downloading… {percent}%";

/** The download's progress while its total size is unknown. */
export const UPDATE_PROGRESS_UNKNOWN_TEXT = "Downloading… (size unknown)";

/** Why the install did not finish. */
export const UPDATE_INSTALL_FAILED_TEXT = "The update could not be installed.";

/** Why the app did not come back up after the install. */
export const UPDATE_RELAUNCH_FAILED_TEXT =
	"The update was installed, but the app could not restart.";

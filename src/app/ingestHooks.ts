import { ACTIVITY } from "@/app/sessionActivity";
import { sessionIDs } from "@/app/tabModel";
import { getTabSnapshot, notifySessionOutput, subscribeToTabs } from "@/app/tabs";
import type { IngestHooks } from "@/session/bundle";

/**
 * The app's wiring for the event ingest (spec 050 §Event ingest, M2.1).
 *
 * Two seams, both app-side, so `src/session/**` stays free of the tab store:
 *
 * - **The held set is the open session tabs** (`sessionIDs`): the strip already
 *   owns "which sessions the app has open", it persists across a restart (M1.5),
 *   and it is the same set whose dots the strip draws. A session the user has
 *   never opened is refused by the ingest rather than buffered.
 * - **`notifySessionOutput` is the unread pip** on a background tab — the seam
 *   `src/app/tabs.ts` already names for M2.1.
 */
export const INGEST_HOOKS: IngestHooks = {
	activity: ACTIVITY,
	sessions: { held: () => sessionIDs(getTabSnapshot()), subscribe: subscribeToTabs },
	onOutput: notifySessionOutput,
};

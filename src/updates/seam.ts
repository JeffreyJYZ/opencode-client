import type { DownloadProgress } from "@/updates/progress";

/**
 * The self-update seam's **types** (M5.6): what the updater boundary offers the
 * flow, and what a release on offer looks like.
 *
 * They are their own module because they are the contract: the store, the notice,
 * the Settings section and every test speak in these terms, and none of them
 * needs to know that a Tauri plugin is on the other side.
 */

/** A release this build can install. */
export type UpdateOffer = {
	readonly version: string;
	/** Release the plugin-side resources this offer holds. */
	release(): void;
};

/** What the updater boundary offers the flow. */
export type UpdateSeam = {
	/** Whether this build can update at all: a de[REDACTED]top app can, a web build cannot. */
	isSupported(): boolean;
	/** The newest release, or `null` when this build is current. */
	check(): Promise<UpdateOffer | null>;
	/**
	 * Download and install the offer, reporting the bytes as they arrive. The
	 * total is `null` when the server did not name one — a share of an unknown
	 * download cannot be computed, and a fake one is a lie.
	 */
	downloadAndInstall(
		offer: UpdateOffer,
		onProgress: (progress: DownloadProgress) => void,
	): Promise<void>;
	/** Restart the app so the freshly installed build runs. */
	relaunch(): Promise<void>;
};

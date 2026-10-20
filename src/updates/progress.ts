/**
 * The download's progress (M5.6): the byte counts the updater reports, and the
 * share of the download they mean.
 *
 * A total the server never named is **`null`, not a guess**: a spinner that
 * claims 50% of an unknown download is a lie, and the one number here is the
 * only place a percentage is computed.
 */

/** What has been received, and the total when the server named one. */
export type DownloadProgress = {
	readonly received: number;
	readonly total: number | null;
};

/**
 * The share of a download that is done, 0–100, or `null` while the total is
 * unknown. A total of zero is as unknown as a missing one.
 */
export function percentOf(progress: DownloadProgress): number | null {
	const { received, total } = progress;
	if (total === null || total <= 0) return null;
	return Math.min(100, Math.max(0, Math.round((received / total) * 100)));
}

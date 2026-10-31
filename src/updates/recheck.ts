import { UPDATE_RECHECK_INTERVAL_MS } from "@/constants/updates";

/**
 * The periodic re-check (M5.7): a window that stays open asks again, so a
 * release published after startup still reaches the user.
 *
 * The interval is the constant, and the callback is the store's own
 * `checkForUpdates` — a second check loop would be exactly the duplicate the
 * store exists to prevent. The returned function stops it.
 */
export function startRechecking(
	check: () => void,
	intervalMs: number = UPDATE_RECHECK_INTERVAL_MS,
): () => void {
	const handle = setInterval(check, intervalMs);
	return () => clearInterval(handle);
}

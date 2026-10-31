import { useEffect, useSyncExternalStore } from "react";
import {
	UPDATE_DISMISS_LABEL,
	UPDATE_INSTALL_LABEL,
	UPDATE_NOTICE_LABEL,
	UPDATE_OFFER_TEXT,
	UPDATE_PROGRESS_TEXT,
	UPDATE_PROGRESS_UNKNOWN_TEXT,
} from "@/constants/updates";
import { startRechecking } from "@/updates/recheck";
import {
	checkForUpdates,
	dismissUpdate,
	getUpdateState,
	installUpdate,
	subscribeUpdateState,
} from "@/updates/store";
import { updatesSupported } from "@/updates/updater";
import { UPDATE_NOTICE_STYLE, UPDATE_NOTICE_TEXT_STYLE, UPDATE_ROW_STYLE } from "./updateStyles";

/**
 * The update notice (M5.6): the app's own surface for a release on offer.
 *
 * It is **not** a plugin banner (M4.20) — a plugin must never gain an install
 * affordance — and it is not a modal either: the offer is a line of chrome, not
 * a question that blocks the app. The shell mounts it beside `BannerHost` and
 * `ToastHost`.
 *
 * The notice **starts the check** on mount, and a check that fails is silent:
 * the notice shows nothing at all, so a de[REDACTED]top app that cannot reach the
 * release host is not interrupted by it. Only a real offer renders.
 *
 * The flow itself lives in `src/updates/store.ts`; this component reads and
 * drives that one store, exactly as the Settings section does.
 */
export function UpdateNotice() {
	const state = useSyncExternalStore(subscribeUpdateState, getUpdateState);

	// The startup check, then a periodic one: a window left open must still learn
	// about a release (M5.7). Both drive the same store, so a tick during a
	// download is refused by the store rather than by a second guard here.
	useEffect(() => {
		void checkForUpdates();
		return startRechecking(() => void checkForUpdates());
	}, []);

	if (!updatesSupported()) return null;
	if (state.phase !== "available" && state.phase !== "downloading") return null;
	const version = state.version ?? "";

	return (
		<section aria-label={UPDATE_NOTICE_LABEL} style={UPDATE_NOTICE_STYLE}>
			<span style={UPDATE_NOTICE_TEXT_STYLE}>
				{UPDATE_OFFER_TEXT.replace("{version}", version)}
			</span>
			{state.phase === "downloading" ? (
				<span style={UPDATE_ROW_STYLE}>
					{state.percent === null
						? UPDATE_PROGRESS_UNKNOWN_TEXT
						: UPDATE_PROGRESS_TEXT.replace("{percent}", String(state.percent))}
				</span>
			) : (
				<button type="button" onClick={() => void installUpdate()}>
					{UPDATE_INSTALL_LABEL}
				</button>
			)}
			{state.phase === "downloading" ? null : (
				<button type="button" onClick={dismissUpdate}>
					{UPDATE_DISMISS_LABEL}
				</button>
			)}
		</section>
	);
}

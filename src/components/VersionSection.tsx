import { useSyncExternalStore } from "react";
import { SETTINGS_SECTION_ID } from "@/constants/settings";
import {
	UPDATE_CHECK_LABEL,
	UPDATE_DISMISS_LABEL,
	UPDATE_INSTALL_LABEL,
	UPDATE_OFFER_TEXT,
	UPDATE_PHASE_TEXT,
	UPDATE_PROGRESS_TEXT,
	UPDATE_PROGRESS_UNKNOWN_TEXT,
	UPDATE_UNSUPPORTED_TEXT,
} from "@/constants/updates";
import { VERSION_LABEL, VERSION_SOURCE_NOTE } from "@/constants/version";
import {
	checkForUpdates,
	dismissUpdate,
	getUpdateState,
	installUpdate,
	subscribeUpdateState,
} from "@/updates/store";
import { updatesSupported } from "@/updates/updater";
import appPackage from "../../package.json";

/**
 * The app version, and the update flow beside it (spec 060 M5.3, M5.4, M5.6).
 *
 * The number is `package.json`'s, imported statically: that file is the **one**
 * source of the version, the file `tauri.conf.json` reads for the bundle, and
 * the file a Rust test compares against `Cargo.toml` — so what this shows cannot
 * drift from what the app reports about itself.
 *
 * The flow is the **same one** the startup notice drives: both read and write
 * `src/updates/store.ts`, so there is never a second check loop and never a
 * second download path. A dismissal here is remembered per version, so a newer
 * release still reaches the user.
 */

const SECTION_STYLE = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-3)",
	maxWidth: "var(--oc-content-max-width)",
	padding: "var(--oc-space-4)",
} as const;

const ROW_STYLE = {
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-2)",
	color: "var(--oc-text-muted)",
} as const;

const NOTE_STYLE = {
	color: "var(--oc-text-muted)",
} as const;

export function VersionSection() {
	const state = useSyncExternalStore(subscribeUpdateState, getUpdateState);
	const supported = updatesSupported();
	const busy = state.phase === "checking" || state.phase === "downloading";

	return (
		<section style={SECTION_STYLE} data-section={SETTINGS_SECTION_ID.version}>
			<p style={ROW_STYLE}>
				{VERSION_LABEL} <code data-app-version>{appPackage.version}</code>
			</p>
			<p style={NOTE_STYLE}>{VERSION_SOURCE_NOTE}</p>
			<div style={ROW_STYLE}>
				{supported ? (
					<button type="button" disabled={busy} onClick={() => void checkForUpdates()}>
						{UPDATE_CHECK_LABEL}
					</button>
				) : null}
				<span role="status" data-update-status={state.phase}>
					{supported ? UPDATE_PHASE_TEXT[state.phase] : UPDATE_UNSUPPORTED_TEXT}
					{state.version === null ? null : ` (${state.version})`}
				</span>
			</div>
			{state.phase === "available" ? (
				<div style={ROW_STYLE}>
					<span>{UPDATE_OFFER_TEXT.replace("{version}", state.version ?? "")}</span>
					<button type="button" onClick={() => void installUpdate()}>
						{UPDATE_INSTALL_LABEL}
					</button>
					<button type="button" onClick={dismissUpdate}>
						{UPDATE_DISMISS_LABEL}
					</button>
				</div>
			) : null}
			{state.phase === "downloading" ? (
				<p style={NOTE_STYLE}>
					{state.percent === null
						? UPDATE_PROGRESS_UNKNOWN_TEXT
						: UPDATE_PROGRESS_TEXT.replace("{percent}", String(state.percent))}
				</p>
			) : null}
			{state.phase === "failed" && state.message !== null ? (
				<p style={NOTE_STYLE}>{state.message}</p>
			) : null}
		</section>
	);
}

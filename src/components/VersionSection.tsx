import { isTauri } from "@tauri-apps/api/core";
import type { CSSProperties } from "react";
import { useState } from "react";
import { SETTINGS_SECTION_ID } from "@/constants/settings";
import {
	UPDATE_CHECK_LABEL,
	UPDATE_STATUS_TEXT,
	type UpdateStatus,
	VERSION_LABEL,
	VERSION_SECTION_LABEL,
	VERSION_SOURCE_NOTE,
} from "@/constants/version";
import { checkForUpdate } from "@/updates/updater";
import appPackage from "../../package.json";

/**
 * The app version, and the update check beside it (spec 060 M5.3 and M5.4).
 *
 * The number is `package.json`'s, imported statically: that file is the **one**
 * source of the version, the file `tauri.conf.json` reads for the bundle, and the
 * file a Rust test compares against `Cargo.toml` — so what this shows cannot drift
 * from what the app reports about itself.
 *
 * The check is offered only where it can work: a browser build has no updater.
 */

const SECTION_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-3)",
	maxWidth: "var(--oc-content-max-width)",
	padding: "var(--oc-space-4)",
};

const ROW_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-2)",
	color: "var(--oc-text-muted)",
};

const BUTTON_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-2)",
	cursor: "pointer",
};

const NOTE_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
};

export function VersionSection() {
	const [status, setStatus] = useState<UpdateStatus>("idle");
	const [remote, setRemote] = useState<string | null>(null);
	const desktop = isTauri();

	const onCheck = async (): Promise<void> => {
		setStatus("checking");
		const result = await checkForUpdate();
		if (result.kind === "available") setRemote(result.version);
		else setRemote(null);
		setStatus(result.kind);
	};

	return (
		<section style={SECTION_STYLE} data-section={SETTINGS_SECTION_ID.version}>
			<h2>{VERSION_SECTION_LABEL}</h2>
			<p style={ROW_STYLE}>
				{VERSION_LABEL} <code data-app-version>{appPackage.version}</code>
			</p>
			<p style={NOTE_STYLE}>{VERSION_SOURCE_NOTE}</p>
			<div style={ROW_STYLE}>
				{desktop ? (
					<button type="button" style={BUTTON_STYLE} onClick={onCheck}>
						{UPDATE_CHECK_LABEL}
					</button>
				) : null}
				<span role="status" data-update-status={status}>
					{UPDATE_STATUS_TEXT[status]}
					{remote === null ? null : ` (${remote})`}
				</span>
			</div>
		</section>
	);
}

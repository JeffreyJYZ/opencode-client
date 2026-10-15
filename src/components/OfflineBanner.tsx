import type { CSSProperties } from "react";
import { useConnection, useRetryConnection } from "@/session/ClientProvider";
import { CONNECTION_STATUS } from "@/session/connectionState";

/**
 * The offline banner (spec 050 §Target and auth): a persistent band naming **the
 * url it tried**, with one retry action. Not a toast — it stays until the
 * connection is back, and everything else in the app keeps rendering.
 */

/** The banner's copy; the url comes from the state. */
export const OFFLINE_BANNER_TEXT = "Can't reach the opencode server";
export const OFFLINE_BANNER_RETRY = "Retry";

const BANNER_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: "var(--oc-space-3)",
	padding: "var(--oc-space-2) var(--oc-space-4)",
	background: "var(--oc-surface-raised)",
	color: "var(--oc-text)",
	fontFamily: "var(--oc-font-ui)",
	fontSize: "var(--oc-font-ui-size)",
	borderBottom: "1px solid var(--oc-warn)",
};

const URL_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	overflowWrap: "anywhere",
};

const RETRY_STYLE: CSSProperties = {
	background: "var(--oc-surface-raised-high)",
	color: "var(--oc-text)",
	font: "inherit",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-1) var(--oc-space-3)",
	cursor: "pointer",
};

export function OfflineBanner() {
	const connection = useConnection();
	const retry = useRetryConnection();
	if (connection.status !== CONNECTION_STATUS.offline) return null;
	return (
		<div role="alert" data-connection={connection.status} style={BANNER_STYLE}>
			<span>
				{OFFLINE_BANNER_TEXT} <code style={URL_STYLE}>{connection.url}</code>
			</span>
			<button type="button" onClick={retry} style={RETRY_STYLE}>
				{OFFLINE_BANNER_RETRY}
			</button>
		</div>
	);
}

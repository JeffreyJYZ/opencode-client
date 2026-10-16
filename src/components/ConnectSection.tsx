import type { CSSProperties, FormEvent } from "react";
import { useState } from "react";
import { useSettings } from "@/app/settings/useSettings";
import {
	CONNECT_BUTTON_TEXT,
	CONNECT_FIELD_ID,
	CONNECT_PASSWORD_LABEL,
	CONNECT_SOURCE_TEXT,
	CONNECT_STATE_TEXT,
	CONNECT_TITLE,
	CONNECT_URL_LABEL,
	DISCONNECT_BUTTON_TEXT,
} from "@/constants/connect";
import { BUTTON_STYLE, INPUT_STYLE, LABEL_STYLE, SECTION_STYLE } from "@/constants/settingsUi";
import { useConnect, useConnection, useDisconnect, useTarget } from "@/session/ClientProvider";

/**
 * The connect flow's one section (spec 050 §Target and auth): the stored target
 * as a form, and what the live connection is doing. The settings *surface* is
 * M3.5's — this is a single section small enough to sit inside whatever that
 * becomes, and every value comes from a token.
 *
 * The password is a `type="password"` input, never put in a url and never logged:
 * the form submits in-page and the value goes straight into the settings blob.
 */

const FORM_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-2)",
	maxWidth: "32rem",
};

const URL_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	overflowWrap: "anywhere",
};

export function ConnectSection() {
	const stored = useSettings().settings.server;
	const connection = useConnection();
	const target = useTarget();
	const connect = useConnect();
	const disconnect = useDisconnect();
	const [url, setUrl] = useState(stored?.url ?? "");
	const [password, setPassword] = useState(stored?.password ?? "");
	const shownUrl = "url" in connection ? connection.url : (target?.url ?? "");
	const onSubmit = (event: FormEvent): void => {
		event.preventDefault();
		connect({ url: url.trim(), password });
	};
	return (
		<section style={SECTION_STYLE} data-section="connect">
			<h2>{CONNECT_TITLE}</h2>
			<p role="status" data-connection-state={connection.status}>
				{CONNECT_STATE_TEXT[connection.status]}{" "}
				{shownUrl === "" ? null : <code style={URL_STYLE}>{shownUrl}</code>}
				{target === null ? null : ` ${CONNECT_SOURCE_TEXT[target.source]}`}
			</p>
			<form style={FORM_STYLE} onSubmit={onSubmit}>
				<label style={LABEL_STYLE} htmlFor={CONNECT_FIELD_ID.url}>
					{CONNECT_URL_LABEL}
					<input
						id={CONNECT_FIELD_ID.url}
						style={INPUT_STYLE}
						value={url}
						onChange={(event) => setUrl(event.target.value)}
						autoComplete="off"
					/>
				</label>
				<label style={LABEL_STYLE} htmlFor={CONNECT_FIELD_ID.password}>
					{CONNECT_PASSWORD_LABEL}
					<input
						id={CONNECT_FIELD_ID.password}
						style={INPUT_STYLE}
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						autoComplete="off"
					/>
				</label>
				<div style={{ display: "flex", gap: "var(--oc-space-2)" }}>
					<button type="submit" style={BUTTON_STYLE}>
						{CONNECT_BUTTON_TEXT}
					</button>
					{target === null ? null : (
						<button type="button" style={BUTTON_STYLE} onClick={disconnect}>
							{DISCONNECT_BUTTON_TEXT}
						</button>
					)}
				</div>
			</form>
		</section>
	);
}

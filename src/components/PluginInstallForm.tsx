import type { CSSProperties, FormEvent } from "react";
import { useRef, useState } from "react";
import {
	PLUGINS_INSTALL_FAILED,
	PLUGINS_INSTALL_LABEL,
	PLUGINS_INSTALL_OK,
	PLUGINS_INSTALL_TITLE,
	PLUGINS_MANIFEST_LABEL,
	PLUGINS_MANIFEST_NOT_JSON,
	PLUGINS_MANIFEST_PLACEHOLDER,
	PLUGINS_SOURCE_LABEL,
	PLUGINS_SOURCE_PLACEHOLDER,
} from "@/constants/pluginManager";
import { BUTTON_STYLE, INPUT_STYLE, LABEL_STYLE } from "@/constants/settingsUi";
import { installPlugin } from "@/plugins/manager";

/**
 * The install form (M4.5, spec 040 §Build, install, develop: "Install in Settings →
 * Plugins: paste manifest + entry source"). It is the manager's one way in, and it
 * hands the pair to `installPlugin`, which validates the manifest **at install** and
 * records the refusal as a `PluginFault` when it does not pass.
 *
 * The fields are **uncontrolled**: their value is the text the user typed, read at
 * submit, and a refused install must leave it in place to be corrected — a
 * controlled pair would need React state per keystroke for no gain.
 */

const FORM_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-2)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-3)",
};

// The code face comes from the theme's `.oc-code` rule, never from this file (the
// font guard forbids a family outside `src/theme/`).
const AREA_STYLE: CSSProperties = {
	...INPUT_STYLE,
	minHeight: "4rem",
	resize: "vertical",
};

const STATUS_STYLE: CSSProperties = { color: "var(--oc-text-muted)", margin: 0 };

export function PluginInstallForm() {
	const manifestRef = useRef<HTMLTextAreaElement | null>(null);
	const sourceRef = useRef<HTMLTextAreaElement | null>(null);
	const [message, setMessage] = useState("");

	const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
		event.preventDefault();
		const manifestText = manifestRef.current?.value ?? "";
		const source = sourceRef.current?.value ?? "";
		let manifest: unknown;
		try {
			manifest = JSON.parse(manifestText);
		} catch {
			setMessage(PLUGINS_MANIFEST_NOT_JSON);
			return;
		}
		const outcome = installPlugin(manifest, source);
		setMessage(
			outcome.ok ? PLUGINS_INSTALL_OK(outcome.id) : PLUGINS_INSTALL_FAILED(outcome.message),
		);
	};

	return (
		<form style={FORM_STYLE} onSubmit={onSubmit}>
			<h3>{PLUGINS_INSTALL_TITLE}</h3>
			<label style={LABEL_STYLE}>
				{PLUGINS_MANIFEST_LABEL}
				<textarea
					ref={manifestRef}
					className="oc-code"
					style={AREA_STYLE}
					data-plugin-manifest
					placeholder={PLUGINS_MANIFEST_PLACEHOLDER}
				/>
			</label>
			<label style={LABEL_STYLE}>
				{PLUGINS_SOURCE_LABEL}
				<textarea
					ref={sourceRef}
					className="oc-code"
					style={AREA_STYLE}
					data-plugin-source
					placeholder={PLUGINS_SOURCE_PLACEHOLDER}
				/>
			</label>
			<button type="submit" style={BUTTON_STYLE} data-plugin-install>
				{PLUGINS_INSTALL_LABEL}
			</button>
			<p style={STATUS_STYLE} role="status" data-plugin-message>
				{message}
			</p>
		</form>
	);
}

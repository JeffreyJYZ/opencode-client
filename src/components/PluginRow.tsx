import type { CSSProperties } from "react";
import {
	PLUGINS_ACTION,
	PLUGINS_CAPABILITIES_LABEL,
	PLUGINS_CAPABILITY_NOTE,
	PLUGINS_NO_CAPABILITIES,
	PLUGINS_STATE,
	type PluginState,
} from "@/constants/pluginManager";
import { BUTTON_STYLE } from "@/constants/settingsUi";
import type { PluginFault } from "@/plugins/faults";
import type { InstalledPlugin } from "@/plugins/installed";
import { disablePlugin, enablePlugin, reloadPlugin, uninstallPlugin } from "@/plugins/manager";

/**
 * One installed plugin's row (M4.5, spec 040 §Build, install, develop): what it
 * declares, what it is doing now, and the four actions.
 *
 * The capabilities line is the **manifest's own** declaration and the note beside
 * it says plainly that the list is a consent label, not a boundary (spec 040
 * §Capabilities). The faults are the ones `faults.ts` recorded against this id,
 * rendered verbatim — the reason and the message the host wrote, never a
 * re-worded "something went wrong".
 */

const ROW_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-2)",
	border: "1px solid var(--oc-border)",
	borderRadius: "var(--oc-radius)",
	padding: "var(--oc-space-3)",
};

const HEAD_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "baseline",
	gap: "var(--oc-space-2)",
	flexWrap: "wrap",
};

const META_STYLE: CSSProperties = { color: "var(--oc-text-muted)", margin: 0 };
const ACTIONS_STYLE: CSSProperties = {
	display: "flex",
	gap: "var(--oc-space-2)",
	flexWrap: "wrap",
};
const FAULT_STYLE: CSSProperties = { color: "var(--oc-danger)", margin: 0 };

type Props = {
	readonly plugin: InstalledPlugin;
	readonly loaded: boolean;
	readonly faults: readonly PluginFault[];
};

/** Loaded wins; a recorded fault is next; then the user's own switch. */
function stateOf(loaded: boolean, enabled: boolean, faults: readonly PluginFault[]): PluginState {
	if (loaded) return PLUGINS_STATE.loaded;
	if (faults.length > 0) return PLUGINS_STATE.refused;
	return enabled ? PLUGINS_STATE.enabled : PLUGINS_STATE.disabled;
}

export function PluginRow({ plugin, loaded, faults }: Props) {
	const { manifest, enabled } = plugin;
	const id = manifest.id;
	const state = stateOf(loaded, enabled, faults);
	const capabilities = manifest.capabilities ?? [];
	return (
		<article
			style={ROW_STYLE}
			data-plugin-id={id}
			data-plugin-state={state}
			data-plugin-capabilities={capabilities.join(",")}
		>
			<header style={HEAD_STYLE}>
				<strong>{manifest.name}</strong>
				<code data-plugin-version>{`${id} ${manifest.version}`}</code>
				<span role="status" data-plugin-status={state}>
					{state}
				</span>
			</header>
			<p style={META_STYLE}>
				{`${PLUGINS_CAPABILITIES_LABEL}: ${
					capabilities.length === 0 ? PLUGINS_NO_CAPABILITIES : capabilities.join(", ")
				}`}
			</p>
			<p style={META_STYLE}>{PLUGINS_CAPABILITY_NOTE}</p>
			<div style={ACTIONS_STYLE}>
				<button
					type="button"
					style={BUTTON_STYLE}
					data-plugin-action="enable"
					disabled={loaded}
					onClick={() => void enablePlugin(id)}
				>
					{PLUGINS_ACTION.enable}
				</button>
				<button
					type="button"
					style={BUTTON_STYLE}
					data-plugin-action="disable"
					disabled={!loaded}
					onClick={() => disablePlugin(id)}
				>
					{PLUGINS_ACTION.disable}
				</button>
				<button
					type="button"
					style={BUTTON_STYLE}
					data-plugin-action="reload"
					onClick={() => void reloadPlugin(id)}
				>
					{PLUGINS_ACTION.reload}
				</button>
				<button
					type="button"
					style={BUTTON_STYLE}
					data-plugin-action="uninstall"
					onClick={() => uninstallPlugin(id)}
				>
					{PLUGINS_ACTION.uninstall}
				</button>
			</div>
			{faults.map((fault) => (
				<p key={fault.id} style={FAULT_STYLE} data-plugin-fault={fault.reason}>
					{`${fault.area}/${fault.reason}: ${fault.message}`}
				</p>
			))}
		</article>
	);
}

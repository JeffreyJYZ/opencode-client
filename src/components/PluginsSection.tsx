import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import { updateSettings } from "@/app/settings/store";
import { useSettings } from "@/app/settings/useSettings";
import { BuiltinAreaRows } from "@/components/BuiltinAreaRows";
import { PluginInstallForm } from "@/components/PluginInstallForm";
import { PluginPanels } from "@/components/PluginPanels";
import { PluginRow } from "@/components/PluginRow";
import {
	PLUGINS_ENABLED_LABEL,
	PLUGINS_ENABLED_NOTE,
	PLUGINS_FAULT_COUNT,
	PLUGINS_LOCKED_NOTE,
} from "@/constants/pluginManager";
import { PLUGINS_EMPTY_NOTE, PLUGINS_SECTION } from "@/constants/plugins";
import { SECTION_STYLE } from "@/constants/settingsUi";
import { listFaults, subscribeToFaults } from "@/plugins/faults";
import { listLogs, subscribeToLogs } from "@/plugins/logs";
import { getPluginsSnapshot, subscribeToPlugins } from "@/plugins/manager";

/**
 * The Plugins section (M4.5, spec 040 §Build, install, develop) — the plugin
 * manager, as a **settings section, not a route** (repo `AGENTS.md`, "Plugin
 * rules"). It was registered by M3.5 through the same `registerSettingsSection` a
 * plugin's own section uses, so it is always present and there is no control
 * anywhere that removes it: it is a locked built-in area (spec 040 §Model).
 *
 * It renders what the stores record, never a second copy: the installed records
 * from `installed.ts`, which ids the **loader** has running, the faults `faults.ts`
 * recorded, and the log `logs.ts` holds. A fault whose subject is an installed
 * plugin's id renders on that plugin's row; the rest render below, so no fault is
 * hidden.
 */

const NOTE_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	margin: 0,
};

const SWITCH_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-2)",
	color: "var(--oc-text)",
	margin: 0,
};

export function PluginsSection() {
	const { settings } = useSettings();
	const { installed, loaded } = useSyncExternalStore(subscribeToPlugins, getPluginsSnapshot);
	const faults = useSyncExternalStore(subscribeToFaults, listFaults);
	const logs = useSyncExternalStore(subscribeToLogs, listLogs);
	const owned = new Set(installed.map((plugin) => plugin.manifest.id));
	const others = faults.filter((fault) => !owned.has(fault.subject));

	return (
		<section style={SECTION_STYLE} data-section={PLUGINS_SECTION}>
			<p style={NOTE_STYLE}>{PLUGINS_LOCKED_NOTE}</p>
			<label style={SWITCH_STYLE} data-plugin-master-switch>
				<input
					type="checkbox"
					checked={settings.pluginsEnabled}
					onChange={(event) => updateSettings({ pluginsEnabled: event.target.checked })}
				/>
				<span>{PLUGINS_ENABLED_LABEL}</span>
			</label>
			<p style={NOTE_STYLE}>{PLUGINS_ENABLED_NOTE}</p>
			<p style={NOTE_STYLE} data-plugin-fault-count={faults.length}>
				{PLUGINS_FAULT_COUNT(faults.length)}
			</p>
			<PluginInstallForm />
			{/* The locked areas themselves (M4.17): built-in rows whose disable is
			    refused, above the installed plugins. */}
			<BuiltinAreaRows />
			{installed.length === 0 ? (
				<p style={NOTE_STYLE} data-plugin-empty>
					{PLUGINS_EMPTY_NOTE}
				</p>
			) : (
				installed.map((plugin) => (
					<PluginRow
						key={plugin.manifest.id}
						plugin={plugin}
						loaded={loaded.includes(plugin.manifest.id)}
						faults={faults.filter((fault) => fault.subject === plugin.manifest.id)}
					/>
				))
			)}
			<PluginPanels faults={others} logs={logs} />
		</section>
	);
}

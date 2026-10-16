import type { CSSProperties } from "react";
import {
	PLUGINS_FAULTS_LABEL,
	PLUGINS_LOG_LABEL,
	PLUGINS_LOG_LIMIT,
	PLUGINS_NO_FAULTS,
	PLUGINS_NO_LOG,
	PLUGINS_OTHER_FAULTS_NOTE,
} from "@/constants/pluginManager";
import type { PluginFault } from "@/plugins/faults";
import type { PluginLogEntry } from "@/plugins/logs";

/**
 * The two lists under the rows (M4.5, spec 040 §The host): the faults that are not
 * attributable to an installed plugin's **id**, and the scoped log every plugin
 * writes through `host.log`.
 *
 * Faults whose subject *is* an installed plugin's id render on that plugin's row,
 * so every fault is shown exactly once. The log is rendered from `logs.ts`, the
 * same store the host's logger writes to — the panel is not a parallel story.
 */

const BLOCK_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	gap: "var(--oc-space-1)",
};
const NOTE_STYLE: CSSProperties = { color: "var(--oc-text-muted)", margin: 0 };
const FAULT_STYLE: CSSProperties = { color: "var(--oc-danger)", margin: 0 };
// The code face comes from the theme's `.oc-code` rule, never from this file (the
// font guard forbids a family outside `src/theme/`).
const LINE_STYLE: CSSProperties = { margin: 0 };

type Props = {
	readonly faults: readonly PluginFault[];
	readonly logs: readonly PluginLogEntry[];
};

export function PluginPanels({ faults, logs }: Props) {
	return (
		<>
			<section style={BLOCK_STYLE} data-plugin-faults>
				<h3>{PLUGINS_FAULTS_LABEL}</h3>
				<p style={NOTE_STYLE}>{PLUGINS_OTHER_FAULTS_NOTE}</p>
				{faults.length === 0 ? (
					<p style={NOTE_STYLE}>{PLUGINS_NO_FAULTS}</p>
				) : (
					faults.map((fault) => (
						<p key={fault.id} style={FAULT_STYLE} data-plugin-fault={fault.reason}>
							{`${fault.area}/${fault.reason} (${fault.subject}): ${fault.message}`}
						</p>
					))
				)}
			</section>
			<section style={BLOCK_STYLE} data-plugin-log>
				<h3>{PLUGINS_LOG_LABEL}</h3>
				{logs.length === 0 ? (
					<p style={NOTE_STYLE}>{PLUGINS_NO_LOG}</p>
				) : (
					logs.slice(-PLUGINS_LOG_LIMIT).map((entry) => (
						<p key={entry.id} className="oc-code" style={LINE_STYLE}>
							{`${entry.pluginId} ${entry.level}: ${entry.message}`}
						</p>
					))
				)}
			</section>
		</>
	);
}

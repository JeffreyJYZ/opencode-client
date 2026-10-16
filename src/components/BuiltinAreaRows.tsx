import type { CSSProperties } from "react";
import {
	PLUGINS_ACTION,
	PLUGINS_BUILTIN_AREA_DISABLE,
	PLUGINS_BUILTIN_AREA_NOTE,
	PLUGINS_BUILTIN_AREAS_LABEL,
	PLUGINS_BUILTIN_ROW,
} from "@/constants/pluginManager";
import { BUTTON_STYLE } from "@/constants/settingsUi";
import { getBuiltinAreaRows, refuseDisableLockedArea } from "@/plugins/builtinAreas";

/**
 * The locked areas' rows in the manager (M4.17, spec 040 §Model): one row per
 * area from `builtinAreas.ts`, labelled built-in, with the disable button that
 * is **refused** — it calls `refuseDisableLockedArea`, which records the fault
 * naming the area and acts on nothing, because the substrate is the app itself.
 *
 * The rows' actions carry `data-area-action`, deliberately not
 * `data-plugin-action`: every `data-plugin-action` targets an installed
 * plugin's row, and no action here does.
 */

const LABEL_STYLE: CSSProperties = { color: "var(--oc-text-muted)", margin: 0 };
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

export function BuiltinAreaRows() {
	return (
		<>
			<p style={LABEL_STYLE} data-builtin-areas-label>
				{PLUGINS_BUILTIN_AREAS_LABEL}
			</p>
			{getBuiltinAreaRows().map((area) => (
				<article key={area} style={ROW_STYLE} data-builtin-area={area}>
					<header style={HEAD_STYLE}>
						<code data-builtin-area-id>{area}</code>
						<span style={META_STYLE}>{PLUGINS_BUILTIN_ROW}</span>
					</header>
					<p style={META_STYLE}>{PLUGINS_BUILTIN_AREA_NOTE}</p>
					<div style={{ display: "flex", gap: "var(--oc-space-2)" }}>
						<button
							type="button"
							style={BUTTON_STYLE}
							data-area-action="disable"
							aria-label={PLUGINS_BUILTIN_AREA_DISABLE(area)}
							onClick={() => refuseDisableLockedArea(area)}
						>
							{PLUGINS_ACTION.disable}
						</button>
					</div>
				</article>
			))}
		</>
	);
}

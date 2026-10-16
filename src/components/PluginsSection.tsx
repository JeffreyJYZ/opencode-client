import type { CSSProperties } from "react";
import {
	PLUGINS_EMPTY_NOTE,
	PLUGINS_OFF_NOTE,
	PLUGINS_SECTION,
	PLUGINS_TITLE,
} from "@/constants/plugins";
import { SECTION_STYLE } from "@/constants/settingsUi";

/**
 * The Plugins section (M3.5, spec 010 §Routes): the registry row the plugin
 * manager (M4.5) fills in. It is **always registered** here — through the same
 * `registerSettingsSection` a plugin's own section uses — so the surface and the
 * palette already show it and M4.5 needs no settings change.
 *
 * Until the manager lands the section states only what is true: nothing is
 * installed, and plugins are off by default (spec 040 §"Off by default").
 */

const NOTE_STYLE: CSSProperties = {
	color: "var(--oc-text-muted)",
	margin: 0,
};

export function PluginsSection() {
	return (
		<section style={SECTION_STYLE} data-section={PLUGINS_SECTION}>
			<h2>{PLUGINS_TITLE}</h2>
			<p style={NOTE_STYLE}>{PLUGINS_EMPTY_NOTE}</p>
			<p style={NOTE_STYLE}>{PLUGINS_OFF_NOTE}</p>
		</section>
	);
}

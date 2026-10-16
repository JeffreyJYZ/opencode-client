/**
 * The Plugins section's copy (M3.5, spec 040 §Build, install, develop). M3.5
 * **registers** the section so the plugin manager (M4.5) needs no settings
 * change and a plugin's own section joins the same registry; the manager's
 * controls land with those rows, and until then the section states the one thing
 * that is true — nothing is installed and plugins are off by default.
 */

export const PLUGINS_TITLE = "Plugins";

/** The section's `data-section` marker, like its neighbours'. */
export const PLUGINS_SECTION = "plugins";

export const PLUGINS_EMPTY_NOTE = "No plugins are installed.";

/** The master switch's default (spec 040: plugins are off by default). */
export const PLUGINS_OFF_NOTE =
	"Plugins are off by default. Installing, enabling and inspecting one happens here.";

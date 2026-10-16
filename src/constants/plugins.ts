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

/**
 * The host API version this build implements (spec 040 §Manifest, `apiVersion`). A
 * manifest naming a different **major** is refused; a different minor only warns.
 */
export const HOST_API_VERSION = "0.1";

/** The entry file a manifest gets when it names none (spec 040 §Manifest, `entry`). */
export const PLUGIN_ENTRY_DEFAULT = "main.js";

/** The application version this build reports; a manifest's `engines.app` is checked against it. */
export const APP_VERSION = "0.1.0";

/**
 * The globals a built entry reaches for (spec 040 §Entry file): its React and the
 * host API, injected immediately before the import because a bundled app has no
 * module resolver for a plugin directory. The build rewrites `react` and
 * `react/jsx-runtime` onto the first two; the loader installs all three.
 */
export const HOST_GLOBAL = {
	host: "__ocHost",
	react: "__ocReact",
	jsx: "__ocJsx",
} as const;

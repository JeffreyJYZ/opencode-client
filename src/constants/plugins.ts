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

/**
 * The directory a plugin's own files live under, below the app's data root (spec
 * 040 §Capabilities, `plugin-data`). The Rust `safe_id` allowlist guards every
 * path the native bridge joins under it.
 */
export const PLUGIN_DATA_DIR = "plugin-data";

/**
 * The most bytes one plugin's `storage` may hold (plan M4.4). A write that would
 * cross the cap is **refused**, never trimmed: a trimmed value is a corrupt one
 * and the plugin cannot tell, while a refusal is visible and reversible.
 */
export const PLUGIN_DATA_MAX_BYTES = 256 * 1024;

/**
 * A storage key is one path-safe component. The namespace is added by the host,
 * never by a plugin, so a key carrying the separator cannot name another plugin.
 */
export const PLUGIN_STORAGE_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

/** What the host joins a plugin's id and its own keys with. */
export const PLUGIN_STORAGE_SEPARATOR = "::";

/** The levels a plugin's scoped logger writes (spec 040 §The host, `log`). */
export const PLUGIN_LOG_LEVEL = {
	debug: "debug",
	info: "info",
	warn: "warn",
	error: "error",
} as const;

export type PluginLogLevel = (typeof PLUGIN_LOG_LEVEL)[keyof typeof PLUGIN_LOG_LEVEL];

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

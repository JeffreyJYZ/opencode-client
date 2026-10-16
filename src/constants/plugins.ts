/**
 * The Plugins surface's shared vocabulary (M3.5, spec 040 §Build, install,
 * develop): the title and `data-section` marker the settings surface and the
 * command palette both read, plus the host-API constants the loader and the build
 * script share — the manifest's API version, the entry default, the data dir, the
 * log levels, the host globals and the build's input/output dirs. M4.5's manager
 * copy lives in `constants/pluginManager.ts`, so this file stays the **host's**
 * vocabulary and the manager's wording changes when its UI does.
 */

export const PLUGINS_TITLE = "Plugins";

/** The section's `data-section` marker, like its neighbours'. */
export const PLUGINS_SECTION = "plugins";

export const PLUGINS_EMPTY_NOTE = "No plugins are installed.";

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

/** The directory a plugin's **source** lives in, committed (spec 040 §Build). */
export const PLUGIN_SOURCE_DIR = "plugins";

/** Where the build writes an entry; Vite serves `public/` at the site root. */
export const PLUGIN_OUT_DIR = "public/plugins";

/** The source file names the build looks for, in order (spec 040 §Entry file). */
export const PLUGIN_SOURCE_ENTRY = ["main.tsx", "main.ts"] as const;

/**
 * The specifiers the build resolves onto the host globals (spec 040 §Entry file):
 * `react` and `react/jsx-runtime` become reads of `__ocReact` / `__ocJsx`, so a
 * built entry imports nothing and uses the app's own React.
 */
export const PLUGIN_HOST_GLOBAL_SPECIFIERS = ["react", "react/jsx-runtime"] as const;

/**
 * The specifiers the build **externalises and refuses**: a plugin gets the app's
 * React, never a second copy, so an import of `react-dom` survives the bundle and
 * the bare-specifier check fails the build (spec 040 §Entry file: "the built file
 * must import nothing").
 */
export const PLUGIN_REFUSED_SPECIFIERS = ["react-dom", "react-dom/client"] as const;

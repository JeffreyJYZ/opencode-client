/**
 * The plugin manager's copy and keys (M4.5, spec 040 §Build, install, develop).
 *
 * Held apart from `constants/plugins.ts` — the host's own vocabulary — for the same
 * reason a section is a module: the manager's wording changes when its UI does, and
 * nothing else reads it.
 */

/** The `localStorage` key the installed-plugin records live under. */
export const PLUGIN_INSTALLED_KEY = "plugins.installed";

/**
 * What the section says about itself. The manager is one of the two locked areas
 * (spec 040 §Model, `app.builtins`), registered as a built-in through the same
 * registry a plugin writes to, so there is no control here that removes it.
 */
export const PLUGINS_LOCKED_NOTE =
	"The plugin manager is a locked built-in area (spec 040 §Model): it is always present and cannot be disabled.";

/**
 * The master switch (M4.10, spec 040 §Model): the persisted `settings.pluginsEnabled`
 * field, **off by default**. The label and the sentence beside it say what it does —
 * gates *loading*, nothing more.
 */
export const PLUGINS_ENABLED_LABEL = "Enable plugins";
export const PLUGINS_ENABLED_NOTE =
	"Off by default (spec 040 §Model): while this is off, no installed plugin is loaded — nothing downstream is limited once it is on.";

export const PLUGINS_INSTALL_TITLE = "Install a plugin";
export const PLUGINS_MANIFEST_LABEL = "Manifest (plugin.json)";
export const PLUGINS_SOURCE_LABEL = "Entry source (the built main.js)";
export const PLUGINS_INSTALL_LABEL = "Install";
export const PLUGINS_MANIFEST_FIELD = "plugin-manifest";
export const PLUGINS_SOURCE_FIELD = "plugin-source";
export const PLUGINS_MANIFEST_PLACEHOLDER =
	'{ "id": "hello-world", "name": "Hello World", "version": "1.0.0", "apiVersion": "0.1", "engines": { "app": "*" } }';
export const PLUGINS_SOURCE_PLACEHOLDER = "export default { setup(host) { /* … */ } }";

/** The four actions a row offers (spec 040 §Build, install, develop). */
export const PLUGINS_ACTION = {
	enable: "Enable",
	disable: "Disable",
	reload: "Reload",
	uninstall: "Uninstall",
} as const;

export type PluginAction = (typeof PLUGINS_ACTION)[keyof typeof PLUGINS_ACTION];

/**
 * A row's state. `loaded` means its `setup` ran; `enabled` means the user turned it
 * on but nothing is running (a refusal, or the loader off); `refused` means the
 * last activation was dropped and recorded a fault.
 */
export const PLUGINS_STATE = {
	loaded: "loaded",
	enabled: "enabled",
	disabled: "disabled",
	refused: "refused",
} as const;

export type PluginState = (typeof PLUGINS_STATE)[keyof typeof PLUGINS_STATE];

export const PLUGINS_CAPABILITIES_LABEL = "Declared capabilities";
export const PLUGINS_NO_CAPABILITIES = "none declared";

/**
 * The one sentence that must never become "sandbox" (spec 040 §Capabilities): the
 * list is a consent label, and only `plugin-data` is enforced — by path scoping in
 * the shell's `safe_id`, not by anything this app does at run time.
 */
export const PLUGINS_CAPABILITY_NOTE =
	"Consent labels, not a boundary: only plugin-data is enforced, by path scoping in the shell; the rest are labels and change nothing the host does.";

export const PLUGINS_FAULTS_LABEL = "Faults";
export const PLUGINS_NO_FAULTS = "No faults recorded.";
export const PLUGINS_OTHER_FAULTS_NOTE =
	"Faults whose subject is not an installed plugin id — a refused contribution, a theme, a storage key.";

/**
 * The default view's fault count (spec 040 §The host: "the manager's default view
 * surfaces the fault count"), so a refusal is visible without opening the log.
 */
export const PLUGINS_FAULT_COUNT = (count: number): string =>
	count === 1 ? "1 fault recorded." : `${count} faults recorded.`;

export const PLUGINS_LOG_LABEL = "Log";
export const PLUGINS_NO_LOG = "No log lines.";
/** How many log lines the panel renders; the store keeps them all. */
export const PLUGINS_LOG_LIMIT = 50;

export const PLUGINS_INSTALL_OK = (id: string): string => `Installed "${id}".`;
export const PLUGINS_INSTALL_FAILED = (message: string): string => `Install refused: ${message}`;
export const PLUGINS_MANIFEST_NOT_JSON = "Install refused: the manifest is not valid JSON.";

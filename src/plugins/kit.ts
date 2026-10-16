/**
 * The primitives a plugin's UI builds from (spec 040 §The host, `ui.kit`) — so
 * plugin UI matches a built-in's without copying Tailwind strings.
 *
 * **The seam M4.7/M4.8 fill**: the app's own primitives are React components, and
 * importing them here would drag the whole component tree (and its dependencies)
 * into every host, including the service tests that never render. `host.ui.kit`
 * is therefore typed and empty until a row needs it, and `createHostFactory`
 * accepts a kit so the app can supply the real one without a host change.
 */

export type PluginKit = Readonly<Record<string, unknown>>;

/** The kit a host gets when the app supplies none: nothing, said plainly. */
export const PLUGIN_KIT: PluginKit = Object.freeze({});

/**
 * The primitives a plugin's UI builds from (spec 040 §The host, `ui.kit`) — so
 * plugin UI matches a built-in's without copying Tailwind strings.
 *
 * The real kit lives in `src/app/hostKit.ts` (M4.21): the app's own components,
 * passed to `createHostFactory`, which puts it on `host.ui.kit`. It cannot live
 * here because importing the app's components would drag the whole component
 * tree (and its dependencies) into every host, including the service tests that
 * never render.
 *
 * The type is `Partial` of the real kit, so a kit-less host is honestly `{}`:
 * every member is present-or-absent, and a plugin author gets a compile error
 * for a name the kit does not have. The `import type` below is erased at
 * build time — this module still has no runtime import, which is what keeps
 * the service tests' import graph free of the component tree.
 */

import type { AppKit } from "@/app/hostKit";

export type PluginKit = Readonly<Partial<AppKit>>;

/** The kit a host gets when the app supplies none: nothing, said plainly. */
export const PLUGIN_KIT: PluginKit = Object.freeze({});

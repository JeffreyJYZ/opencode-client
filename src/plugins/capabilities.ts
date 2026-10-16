/**
 * The capability labels a manifest may declare (spec 040 §Manifest, §Capabilities).
 *
 * They are **consent labels, not a boundary**: only `plugin-data` is enforced —
 * by path scoping in Rust `safe_id` — and the rest are shown at install and mean
 * nothing to the host. Never describe them as a sandbox.
 */
export const PLUGIN_CAPABILITIES = [
	"plugin-data",
	"net",
	"window",
	"shortcuts",
	"invoke",
	"fs-any",
] as const;

export type PluginCapability = (typeof PLUGIN_CAPABILITIES)[number];

/**
 * The one label that is **enforced** rather than merely declared: the shell's
 * `safe_id` scopes every path the native bridge joins under `plugin-data/<id>/`.
 * Named here so the in-app reference (M4.8) reads the enforced set instead of
 * repeating the one string that matters in a second place.
 */
export const PLUGIN_ENFORCED_CAPABILITIES: readonly PluginCapability[] = ["plugin-data"];

const KNOWN: ReadonlySet<string> = new Set<string>(PLUGIN_CAPABILITIES);

/** The runtime half of the tuple: how a declared capability is checked. */
export function isPluginCapability(value: string): value is PluginCapability {
	return KNOWN.has(value);
}

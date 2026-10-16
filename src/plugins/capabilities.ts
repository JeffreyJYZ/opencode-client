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

const KNOWN: ReadonlySet<string> = new Set<string>(PLUGIN_CAPABILITIES);

/** The runtime half of the tuple: how a declared capability is checked. */
export function isPluginCapability(value: string): value is PluginCapability {
	return KNOWN.has(value);
}

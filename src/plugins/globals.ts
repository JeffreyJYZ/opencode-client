import { HOST_GLOBAL } from "@/constants/plugins";

/**
 * The host globals (spec 040 §Entry file). A plugin's built entry imports nothing;
 * `react` and `react/jsx-runtime` are rewritten onto `__ocReact` / `__ocJsx` by the
 * build, and the host API is `__ocHost`. They are set immediately before the import
 * because a bundled app has no module resolver for a plugin directory.
 */

/** The mutable global object, typed so a computed key can address it. */
function host(): Record<string, unknown> {
	return globalThis as unknown as Record<string, unknown>;
}

/** Install the three globals. Idempotent — each load rewrites the same values. */
export function installHostGlobals(values: {
	readonly host: unknown;
	readonly react: unknown;
	readonly jsx: unknown;
}): void {
	const target = host();
	target[HOST_GLOBAL.host] = values.host;
	target[HOST_GLOBAL.react] = values.react;
	target[HOST_GLOBAL.jsx] = values.jsx;
}

/** The globals a module would reach for that are not installed; empty when all are. */
export function missingHostGlobals(): readonly string[] {
	const target = host();
	return Object.values(HOST_GLOBAL).filter((name) => target[name] === undefined);
}

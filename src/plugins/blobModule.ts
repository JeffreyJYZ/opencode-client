/**
 * Reaching a plugin's built entry (spec 040 §Entry file, §Build, install, develop).
 *
 * The **production path** is a `Blob`: an installed plugin's source is a string,
 * so it is wrapped in a `Blob` and imported from its object URL — a bundled app
 * has no asset URL for a plugin it never built. `vite dev` imports a built asset
 * instead, which is why a plugin cannot be exercised under the dev server.
 */

/** The module a built entry evaluates to; its shape is checked by the caller. */
export type PluginModule = Record<string, unknown>;

/** A plugin's `setup`, once the module's export has been checked. */
export type PluginSetup = (host: object) => unknown;

/** How the loader reaches a module — the importer, so a test can supply one. */
export type ModuleImporter = (url: string) => Promise<PluginModule>;

/** The one importer: a dynamic import of the URL the loader builds. */
export function importFromUrl(url: string): Promise<PluginModule> {
	return import(/* @vite-ignore */ url) as Promise<PluginModule>;
}

/** The object URL a piece of source is imported from. */
export function toBlobUrl(source: string): string {
	return URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
}

/** Import a built entry from a `Blob`; the URL is revoked once the module is in hand. */
export async function importPluginSource(
	source: string,
	importer: ModuleImporter = importFromUrl,
): Promise<PluginModule> {
	const url = toBlobUrl(source);
	try {
		return await importer(url);
	} finally {
		URL.revokeObjectURL(url);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/** A specifier the webview cannot resolve: not relative, not absolute, and no scheme. */
function isBareSpecifier(specifier: string): boolean {
	return !specifier.startsWith(".") && !specifier.startsWith("/") && !specifier.includes(":");
}

/**
 * The bare specifiers a built entry still carries (spec 040 §Entry file). The build
 * bundles every other bare import and rewrites `react` onto the host globals, so a
 * built entry imports nothing — and the webview, unlike Bun, has no resolver for a
 * plugin directory, so a survivor is refused **before** the import is attempted.
 */
export function bareSpecifiers(source: string): readonly string[] {
	const patterns = [
		/\bimport\s+(?:[^;'"]*?\bfrom\s*)?["']([^"']+)["']/g,
		/\bexport\s+(?:\*|\{[^}]*\})\s*from\s*["']([^"']+)["']/g,
		/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
	];
	const found: string[] = [];
	for (const pattern of patterns) {
		for (const match of source.matchAll(pattern)) {
			const specifier = match[1];
			if (specifier === undefined) continue;
			if (isBareSpecifier(specifier) && !found.includes(specifier)) found.push(specifier);
		}
	}
	return found;
}

/** The module's `setup`: from `export default { setup }` or a named `setup` export. */
export function setupOf(module: PluginModule): PluginSetup | null {
	const entry = module.default;
	const fromDefault = isRecord(entry) ? entry.setup : undefined;
	const candidate = fromDefault ?? module.setup;
	return typeof candidate === "function" ? (candidate as PluginSetup) : null;
}

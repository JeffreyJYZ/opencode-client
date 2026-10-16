import {
	BUILTIN_THEME_IDS,
	FOLLOW_SYSTEM_THEME_ID,
	THEME_CSS_END_TAG,
	THEME_MODE,
	type Theme,
} from "@/constants/theme";
import { BUILTIN_THEMES } from "@/theme/themes";

/**
 * The theme registry (spec 030 §Theme service, spec 040 §The host): one map, one
 * publish, and the built-in pair seeded through it — so a plugin's theme and a
 * built-in are the same kind of row, and `listThemes()` has one source.
 *
 * Registering is **synchronous** and returns a `Disposable`, the same contract
 * `plugins/registry.ts` gives a slot, and the same refusal rule: a malformed
 * theme is dropped and recorded as a `PluginFault`, never thrown. The service
 * (`theme/service.ts`) is the public seam; this module is the storage half.
 */

const byId = new Map<string, Theme>();
const listeners = new Set<() => void>();
let snapshot: readonly Theme[] = [];

function publish(): void {
	snapshot = [...byId.values()];
	for (const listener of [...listeners]) listener();
}

/** The built-ins, then whatever was registered after them. */
function seed(): void {
	byId.clear();
	for (const theme of BUILTIN_THEMES) byId.set(theme.id, theme);
	publish();
}

seed();

/** Every registered theme, built-ins first. Identity-stable until one changes. */
export function listThemes(): readonly Theme[] {
	return snapshot;
}

export function getTheme(id: string): Theme | null {
	return byId.get(id) ?? null;
}

export function insertTheme(theme: Theme): void {
	byId.set(theme.id, theme);
	publish();
}

export function removeTheme(id: string): void {
	if (byId.delete(id)) publish();
}

export function subscribeToThemes(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The tests' reset: the built-ins only, nothing a test registered. */
export function resetThemeRegistry(): void {
	seed();
}

/** What is wrong with a theme a caller offered, or `null` when nothing is. */
export function themeProblem(theme: unknown): string | null {
	if (typeof theme !== "object" || theme === null) return "no theme object";
	const { id, name, mode, variables, css } = theme as Partial<Theme>;
	if (typeof id !== "string" || id.trim() === "") return "an empty id";
	if (BUILTIN_THEME_IDS.includes(id)) return `the built-in id "${id}"`;
	// The follow-system sentinel is a stored *preference*, not a theme (M3.6): a
	// plugin taking its id would make the two indistinguishable in `settings.theme`.
	if (id === FOLLOW_SYSTEM_THEME_ID) return `the reserved id "${id}"`;
	if (typeof name !== "string" || name.trim() === "") return "an empty name";
	if (mode !== THEME_MODE.dark && mode !== THEME_MODE.light) {
		return `the unknown mode "${String(mode)}"`;
	}
	if (typeof variables !== "object" || variables === null || Array.isArray(variables)) {
		return "malformed variables";
	}
	for (const [token, value] of Object.entries(variables)) {
		if (!token.startsWith("--")) return `the variable name "${token}"`;
		if (typeof value !== "string" || value.trim() === "") return `the value of "${token}"`;
	}
	if (css !== undefined && typeof css !== "string") return "a non-string css block";
	if (typeof css === "string" && css.includes(THEME_CSS_END_TAG)) {
		return "a css block that would close the style element";
	}
	return null;
}

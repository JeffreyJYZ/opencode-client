import { RECENT_DIRECTORIES_LIMIT } from "@/constants/directories";
import { DEFAULT_LAST_ROUTE, FONT_ROLE } from "@/constants/settings";
import {
	clampFontSize,
	DEFAULT_FONTS,
	type FontPreferences,
	type FontRole,
	type FontRolePreference,
} from "@/theme/fonts";

/**
 * The blob's plain fields, read defensively (spec 010 §Persistence). A blob is
 * user-writable state on disk, so a wrong type there must degrade one
 * field rather than refuse the whole payload.
 *
 * These are the fields with no domain of their own — the route, the last-opened
 * session, the fonts, the theme and the recent directories. The cells that do
 * have a domain keep their own reader next door (`sidebar.ts`, `scroll.ts`,
 * `server.ts`, `tabState.ts`).
 */

/** The stored route, or the landing route when it is not a path. */
export function normalizeLastRoute(raw: unknown): string {
	return typeof raw === "string" && raw.startsWith("/") ? raw : DEFAULT_LAST_ROUTE;
}

/** The stored session id, or `null` when none was stored. */
export function normalizeLastOpened(raw: unknown): string | null {
	return typeof raw === "string" && raw !== "" ? raw : null;
}

/** The stored font preferences, each role falling back to its own default. */
export function normalizeFonts(raw: unknown): FontPreferences {
	const record = isRecord(raw) ? raw : {};
	return {
		ui: normalizeFontRole(FONT_ROLE.ui, record[FONT_ROLE.ui]),
		code: normalizeFontRole(FONT_ROLE.code, record[FONT_ROLE.code]),
	};
}

function normalizeFontRole(role: FontRole, raw: unknown): FontRolePreference {
	const record = isRecord(raw) ? raw : {};
	const { family, size } = record;
	const fallback = DEFAULT_FONTS[role];
	return {
		family:
			typeof family === "string" && family.trim() !== "" ? family.trim() : fallback.family,
		size: typeof size === "number" ? clampFontSize(role, size) : fallback.size,
	};
}

/**
 * The stored theme id, the follow-system sentinel, or `null`. It is **not**
 * checked against the registry here: a plugin's theme is registered when its
 * plugin loads, after this read, so an unknown id is a normal state to boot
 * through — `applyAppearance()` resolves it and falls back to the built-in,
 * leaving the id stored for that later load. The sentinel is a plain string like
 * any other here; only the applier gives it meaning (M3.6).
 */
export function normalizeTheme(raw: unknown): string | null {
	return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

/** The stored directories, de-duplicated and capped. */
export function normalizeDirectories(raw: unknown): readonly string[] {
	const entries = Array.isArray(raw) ? raw : [];
	const directories: string[] = [];
	for (const entry of entries) {
		if (typeof entry !== "string" || entry === "" || directories.includes(entry)) continue;
		directories.push(entry);
	}
	return directories.slice(0, RECENT_DIRECTORIES_LIMIT);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

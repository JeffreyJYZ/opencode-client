import { NO_TAB_SCROLL, normalizeTabScroll, type TabScrollMap } from "@/app/settings/scroll";
import { normalizeServer, type ServerTarget } from "@/app/settings/server";
import { normalizeSidebar, type SidebarState } from "@/app/settings/sidebar";
import { normalizeTabs } from "@/app/settings/tabState";
import type { SerializedTabs } from "@/app/tabModel";
import { RECENT_DIRECTORIES_LIMIT } from "@/constants/directories";
import {
	DEFAULT_LAST_ROUTE,
	DEFAULT_SIDEBAR,
	FONT_ROLE,
	SETTING_KEYS,
	SETTINGS_DATA_VERSION,
	type SETTINGS_NOTICE_KIND,
} from "@/constants/settings";
import {
	clampFontSize,
	DEFAULT_FONTS,
	type FontPreferences,
	type FontRole,
	type FontRolePreference,
} from "@/theme/fonts";

/**
 * The blob's fields, in memory (spec 010 §Persistence). Reading is defensive for
 * every field: a blob is user-writable state on disk, so a wrong type there must
 * degrade one field rather than refuse the whole payload or throw mid-render.
 *
 * The `settings.tabs` cell lives next door in `tabState.ts`; the fonts' own
 * arithmetic lives with the theme (`theme/fonts.ts`).
 */

export type SettingsData = {
	readonly tabs: SerializedTabs;
	/** A path the router understands; `DEFAULT_LAST_ROUTE` when none was stored. */
	readonly lastRoute: string;
	readonly lastOpened: string | null;
	readonly sidebar: SidebarState;
	readonly fonts: FontPreferences;
	/**
	 * The stored theme **choice** (M3.4): a theme id, the follow-system sentinel
	 * `FOLLOW_SYSTEM_THEME_ID` (M3.6), or `null` for the built-in default.
	 */
	readonly theme: string | null;
	readonly recentDirectories: readonly string[];
	/** The connect flow's stored target, or `null` before one is stored. */
	readonly server: ServerTarget | null;
	/** Where each tab's transcript was left (M2.9), keyed by the **tab**, not a session. */
	readonly transcriptScroll: TabScrollMap;
	/** The plugin master switch (M4.10, spec 040 §Model): off by default. */
	readonly pluginsEnabled: boolean;
};

/**
 * A document is the blob as it sits on disk: the known fields plus **every field
 * this build does not know**, which spec 010 requires is never dropped.
 */
export type SettingsDocument = Record<string, unknown>;

export type SettingsNotice = {
	readonly id: (typeof SETTINGS_NOTICE_KIND)[keyof typeof SETTINGS_NOTICE_KIND];
	readonly message: string;
};

export const DEFAULT_SETTINGS: SettingsData = {
	tabs: { tabs: [], activeIndex: -1 },
	lastRoute: DEFAULT_LAST_ROUTE,
	lastOpened: null,
	sidebar: { ...DEFAULT_SIDEBAR },
	fonts: DEFAULT_FONTS,
	recentDirectories: [],
	server: null,
	transcriptScroll: NO_TAB_SCROLL,
	// The tail's order is the migration chain's: v3→v4 appends `theme`, v4→v5
	// appends `pluginsEnabled`, and `storage.test.ts` compares the two key orders.
	theme: null,
	pluginsEnabled: false,
};

/** A document holding the defaults at the current version. */
export function freshDocument(): SettingsDocument {
	return { [SETTING_KEYS.dataVersion]: SETTINGS_DATA_VERSION, ...DEFAULT_SETTINGS };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function settingsFromDocument(document: SettingsDocument): SettingsData {
	return {
		tabs: normalizeTabs(document[SETTING_KEYS.tabs]),
		lastRoute: normalizeLastRoute(document[SETTING_KEYS.lastRoute]),
		lastOpened: normalizeLastOpened(document[SETTING_KEYS.lastOpened]),
		sidebar: normalizeSidebar(document[SETTING_KEYS.sidebar]),
		fonts: normalizeFonts(document[SETTING_KEYS.fonts]),
		theme: normalizeTheme(document[SETTING_KEYS.theme]),
		recentDirectories: normalizeDirectories(document[SETTING_KEYS.recentDirectories]),
		server: normalizeServer(document[SETTING_KEYS.server]),
		transcriptScroll: normalizeTabScroll(document[SETTING_KEYS.transcriptScroll]),
		pluginsEnabled: document[SETTING_KEYS.pluginsEnabled] === true,
	};
}

function normalizeLastRoute(raw: unknown): string {
	return typeof raw === "string" && raw.startsWith("/") ? raw : DEFAULT_LAST_ROUTE;
}

function normalizeLastOpened(raw: unknown): string | null {
	return typeof raw === "string" && raw !== "" ? raw : null;
}

function normalizeFonts(raw: unknown): FontPreferences {
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
function normalizeTheme(raw: unknown): string | null {
	return typeof raw === "string" && raw.trim() !== "" ? raw.trim() : null;
}

function normalizeDirectories(raw: unknown): readonly string[] {
	const entries = Array.isArray(raw) ? raw : [];
	const directories: string[] = [];
	for (const entry of entries) {
		if (typeof entry !== "string" || entry === "" || directories.includes(entry)) continue;
		directories.push(entry);
	}
	return directories.slice(0, RECENT_DIRECTORIES_LIMIT);
}

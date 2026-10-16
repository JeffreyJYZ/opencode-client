import { ROUTE_PATH } from "@/constants/routes";

/**
 * The versioned settings blob's constants (spec 010 §Persistence, spec 030 §Two
 * font roles). Naming follows the plan's rule: `SETTING_KEYS.*` for persisted
 * keys.
 *
 * One blob under one storage key: spec 010's table names the *fields*
 * (`settings.tabs` is the blob `settings` → its `tabs` field), and a single key
 * is what makes "one versioned blob with `dataVersion`" (spec 010:81) true — one
 * writer, one version to migrate, one place a newer build's data can sit.
 */

/** The one storage key the blob lives under. */
export const SETTINGS_STORAGE_KEY = "settings";

/**
 * The version this build writes. v2 added `settings.server` (spec 050 §Target and
 * auth); **v3 adds `settings.transcriptScroll`** (M2.9); **v4 adds
 * `settings.theme`** (M3.4, the theme service's stored choice). A step per
 * version keeps the invariant `storage.test.ts` asserts — a migrated document
 * has exactly the keys this writer produces — and a field an older build does
 * not know is copied through untouched (spec 010 §Persistence).
 */
export const SETTINGS_DATA_VERSION = 4;

/**
 * The version a blob with no version field is read as: the pre-versioning shape,
 * which is what a hand-written or older payload under this key is.
 */
export const SETTINGS_BASE_VERSION = 0;

/** How many migrations one read may chain before the blob counts as unreadable. */
export const SETTINGS_MIGRATION_LIMIT = 8;

/** The blob's field names, so no caller holds a literal. */
export const SETTING_KEYS = {
	dataVersion: "dataVersion",
	tabs: "tabs",
	lastRoute: "lastRoute",
	lastOpened: "lastOpened",
	sidebar: "sidebar",
	fonts: "fonts",
	theme: "theme",
	recentDirectories: "recentDirectories",
	server: "server",
	transcriptScroll: "transcriptScroll",
} as const;

/** The key the version-0 blob held the active tab under (v1 nests it in `tabs`). */
export const LEGACY_ACTIVE_TAB_KEY = "activeIndex";

/** Where the app lands when the restore had nothing to land on (spec 010 §Home). */
export const DEFAULT_LAST_ROUTE = ROUTE_PATH.home;

/**
 * The settings sections a built-in registers (spec 010 §Routes). The registry is
 * `src/app/settings/sections.ts`; M3.5 adds Appearance/Plugins there and the
 * command palette lists them without a change. Typography landed with M3.2.
 */
export const SETTINGS_SECTION_ID = {
	connect: "connect",
	typography: "typography",
} as const;

/** Sidebar defaults — spec 010 §Persistence's "visible + width"; M2.7 owns its UI. */
export const DEFAULT_SIDEBAR = { visible: true, width: 260 } as const;
export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 480;

/** The two font roles (spec 030 §Two font roles). */
export const FONT_ROLE = { ui: "ui", code: "code" } as const;

/** Face and size defaults and bounds (spec 030 §How a font is applied). */
export const DEFAULT_UI_FONT_FAMILY = "Geist";
export const DEFAULT_CODE_FONT_FAMILY = "GeistMono Nerd Font";
export const DEFAULT_UI_FONT_SIZE = 15;
export const DEFAULT_CODE_FONT_SIZE = 13;
/** The bundled code face: the fallback behind the machine's Nerd Font (M3.1). */
export const BUNDLED_CODE_FONT_FAMILY = "Geist Mono";
export const UI_FONT_SIZE_MIN = 12;
export const UI_FONT_SIZE_MAX = 20;
export const CODE_FONT_SIZE_MIN = 11;
export const CODE_FONT_SIZE_MAX = 18;

/** The custom properties `applyFonts()` writes (spec 030 §How a font is applied). */
export const FONT_VARIABLE = {
	uiFamily: "--oc-font-ui-family",
	uiSize: "--oc-font-ui-size",
	codeFamily: "--oc-font-code-family",
	codeSize: "--oc-font-code-size",
} as const;

/** What the user is told when the stored blob could not be used. */
export const SETTINGS_NOTICE_TEXT = {
	unreadable: "Saved settings were unreadable and have been reset to defaults.",
	newer: "Saved settings come from a newer version of this app, so they were left alone and this session will not overwrite them.",
} as const;

/** A notice's id — what happened to the stored blob. */
export const SETTINGS_NOTICE_KIND = {
	unreadable: "unreadable",
	newer: "newer",
} as const;

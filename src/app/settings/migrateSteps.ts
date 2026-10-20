import type { SettingsDocument } from "@/app/settings/model";
import type { Tab } from "@/app/tabModel";
import { LEGACY_ACTIVE_TAB_KEY, SETTING_KEYS } from "@/constants/settings";
import { TAB_KIND } from "@/constants/tabs";

/**
 * The forward-only migration steps (spec 010 §Persistence: "a newer build reads
 * and migrates an older blob"). Each step is a pure function from version `n`
 * to `n + 1`; the chain that walks them is `migrate.ts`.
 *
 * Every step introduces its field as **explicitly absent** rather than leaving
 * the field's meaning to "whatever a reader defaults to", and never clobbers a
 * field the blob already carries (spec 010 §Persistence: a step must not drop
 * what it does not know).
 */

/**
 * The version-0 strip. Spec 010's table describes `settings.tabs` as "session
 * ids, plus the settings view while it is open", so a pre-versioning blob held
 * `["ses_a", "settings"]` — a bare list — where this build serializes tab
 * objects. Everything else the blob carried is copied through untouched.
 */
export function v0ToV1(document: SettingsDocument): SettingsDocument {
	const raw = document[SETTING_KEYS.tabs];
	const entries = Array.isArray(raw) ? raw : [];
	const tabs: Tab[] = [];
	for (const entry of entries) {
		if (entry === TAB_KIND.settings) tabs.push({ kind: TAB_KIND.settings });
		else if (typeof entry === "string" && entry !== "") {
			tabs.push({ kind: TAB_KIND.session, id: entry });
		}
	}
	const index = document[LEGACY_ACTIVE_TAB_KEY];
	return {
		...document,
		[SETTING_KEYS.tabs]: {
			tabs,
			activeIndex: typeof index === "number" ? index : 0,
		},
	};
}

/**
 * The version-1 blob. Nothing in v1 carried a server target — spec 010's table
 * had no key for it — so the step introduces `settings.server` as explicitly
 * absent rather than leaving the field's meaning to "whatever a reader defaults
 * to". Everything the blob carried is copied through untouched.
 */
export function v1ToV2(document: SettingsDocument): SettingsDocument {
	// Never clobber a field already present: spec 010 requires a step not to drop
	// what it does not know, and v1 has no server field by definition.
	if (SETTING_KEYS.server in document) return document;
	return { ...document, [SETTING_KEYS.server]: null };
}

/**
 * The version-2 blob. Nothing in v2 carried a per-tab scroll position, so the step
 * introduces `settings.transcriptScroll` as explicitly empty rather than leaving
 * the field's meaning to "whatever a reader defaults to" (M2.9). Everything the
 * blob carried is copied through untouched.
 */
export function v2ToV3(document: SettingsDocument): SettingsDocument {
	if (SETTING_KEYS.transcriptScroll in document) return document;
	return { ...document, [SETTING_KEYS.transcriptScroll]: {} };
}

/**
 * The version-3 blob. Nothing in v3 carried a theme choice — the theme service
 * lands with M3.4 — so the step introduces `settings.theme` as explicitly absent
 * (`null`, the built-in default) rather than leaving the field's meaning to
 * "whatever a reader defaults to". Everything the blob carried is copied through
 * untouched.
 */
export function v3ToV4(document: SettingsDocument): SettingsDocument {
	if (SETTING_KEYS.theme in document) return document;
	return { ...document, [SETTING_KEYS.theme]: null };
}

/**
 * The version-4 blob. Nothing in v4 carried the plugin master switch — the
 * manager's setting lands with M4.10 — so the step introduces
 * `settings.pluginsEnabled` as explicitly **off** (spec 040 §Model: "off by
 * default") rather than leaving the field's meaning to "whatever a reader
 * defaults to". Everything the blob carried is copied through untouched.
 */
export function v4ToV5(document: SettingsDocument): SettingsDocument {
	if (SETTING_KEYS.pluginsEnabled in document) return document;
	return { ...document, [SETTING_KEYS.pluginsEnabled]: false };
}

/**
 * The version-5 blob. Nothing in v5 carried a declined release — the self-update
 * flow lands with M5.6 — so the step introduces `settings.dismissedUpdateVersion`
 * as explicitly absent (`null`, nothing declined) rather than leaving the field's
 * meaning to "whatever a reader defaults to". Everything the blob carried is
 * copied through untouched.
 */
export function v5ToV6(document: SettingsDocument): SettingsDocument {
	if (SETTING_KEYS.dismissedUpdateVersion in document) return document;
	return { ...document, [SETTING_KEYS.dismissedUpdateVersion]: null };
}

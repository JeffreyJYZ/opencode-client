import { isRecord, type SettingsDocument } from "@/app/settings/model";
import type { Tab } from "@/app/tabModel";
import {
	LEGACY_ACTIVE_TAB_KEY,
	SETTING_KEYS,
	SETTINGS_BASE_VERSION,
	SETTINGS_DATA_VERSION,
	SETTINGS_MIGRATION_LIMIT,
} from "@/constants/settings";
import { TAB_KIND } from "@/constants/tabs";

/**
 * Forward-only migrations (spec 010 §Persistence: "a newer build reads and
 * migrates an older blob"). Each step is a pure function from version `n` to
 * `n + 1`, and the loop stamps the version itself, so a step that forgets to
 * cannot stall the chain.
 */

export type SettingsMigration = (document: SettingsDocument) => SettingsDocument;

/**
 * The version-0 strip. Spec 010's table describes `settings.tabs` as "session
 * ids, plus the settings view while it is open", so a pre-versioning blob held
 * `["ses_a", "settings"]` — a bare list — where this build serializes tab
 * objects. Everything else the blob carried is copied through untouched.
 */
function v0ToV1(document: SettingsDocument): SettingsDocument {
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
function v1ToV2(document: SettingsDocument): SettingsDocument {
	// Never clobber a field already present: spec 010 requires a step not to drop
	// what it does not know, and v1 has no server field by definition.
	if (SETTING_KEYS.server in document) return document;
	return { ...document, [SETTING_KEYS.server]: null };
}

/** Registry keyed by source version: `MIGRATIONS[from]` produces `from + 1`. */
export const SETTINGS_MIGRATIONS: Readonly<Record<number, SettingsMigration>> = {
	[SETTINGS_BASE_VERSION]: v0ToV1,
	[SETTINGS_BASE_VERSION + 1]: v1ToV2,
};

export type MigrationOutcome =
	| { readonly kind: "ok"; readonly document: SettingsDocument }
	/** Written by a newer build: readable by nobody here, and never overwritten. */
	| { readonly kind: "newer" }
	/** Not a document, or a version this build cannot walk forward from. */
	| { readonly kind: "unreadable" };

/** The version a document claims; `null` when the field is not a version. */
function documentVersion(document: SettingsDocument): number | null {
	const value = document[SETTING_KEYS.dataVersion];
	if (value === undefined) return SETTINGS_BASE_VERSION;
	return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Walk a document forward to `target`. A blob **newer** than the target is
 * refused (`newer`) rather than migrated down or reset — see the store's
 * newer-version policy; a missing step is `unreadable`, never a silent skip.
 */
export function migrateDocument(
	document: SettingsDocument,
	registry: Readonly<Record<number, SettingsMigration>> = SETTINGS_MIGRATIONS,
	target: number = SETTINGS_DATA_VERSION,
): MigrationOutcome {
	let current = document;
	let version = documentVersion(document);
	if (version === null) return { kind: "unreadable" };
	if (version > target) return { kind: "newer" };
	let steps = 0;
	while (version < target) {
		const step = registry[version];
		if (step === undefined || steps >= SETTINGS_MIGRATION_LIMIT) return { kind: "unreadable" };
		const migrated = step(current);
		current = isRecord(migrated)
			? { ...migrated, [SETTING_KEYS.dataVersion]: version + 1 }
			: { [SETTING_KEYS.dataVersion]: version + 1 };
		version += 1;
		steps += 1;
	}
	return { kind: "ok", document: current };
}

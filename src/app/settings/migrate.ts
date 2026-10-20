import { v0ToV1, v1ToV2, v2ToV3, v3ToV4, v4ToV5, v5ToV6 } from "@/app/settings/migrateSteps";
import { isRecord, type SettingsDocument } from "@/app/settings/model";
import {
	SETTING_KEYS,
	SETTINGS_BASE_VERSION,
	SETTINGS_DATA_VERSION,
	SETTINGS_MIGRATION_LIMIT,
} from "@/constants/settings";

/**
 * Forward-only migrations (spec 010 §Persistence: "a newer build reads and
 * migrates an older blob"). Each step is a pure function from version `n` to
 * `n + 1`, and the loop stamps the version itself, so a step that forgets to
 * cannot stall the chain.
 *
 * The steps themselves live in `migrateSteps.ts`, one per version; this module
 * is the chain that walks them.
 */

export type SettingsMigration = (document: SettingsDocument) => SettingsDocument;

/** Registry keyed by source version: `MIGRATIONS[from]` produces `from + 1`. */
export const SETTINGS_MIGRATIONS: Readonly<Record<number, SettingsMigration>> = {
	[SETTINGS_BASE_VERSION]: v0ToV1,
	[SETTINGS_BASE_VERSION + 1]: v1ToV2,
	[SETTINGS_BASE_VERSION + 2]: v2ToV3,
	[SETTINGS_BASE_VERSION + 3]: v3ToV4,
	[SETTINGS_BASE_VERSION + 4]: v4ToV5,
	[SETTINGS_BASE_VERSION + 5]: v5ToV6,
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
 * newer-version policy; a missing step is `unreadable`, never a silent [REDACTED]ip.
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

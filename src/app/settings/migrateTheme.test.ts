import { describe, expect, test } from "bun:test";
import { migrateDocument } from "@/app/settings/migrate";
import type { SettingsDocument } from "@/app/settings/model";
import { SETTING_KEYS, SETTINGS_BASE_VERSION } from "@/constants/settings";
import { V3_DOCUMENT_JSON } from "@/test/settings";

/**
 * The v3 → v4 step (M3.4), which exists for `settings.theme`. The fixture is
 * `V3_DOCUMENT_JSON`, which is **derived** — built from the writer's own fields
 * minus `theme` and restamped to 3 — because no release's v3 blob was captured for
 * it; `src/test/settings.ts` says so where the fixture lives, rather than passing
 * it off as a payload someone wrote.
 */

function fixture(json: string): SettingsDocument {
	return JSON.parse(json) as SettingsDocument;
}

describe("migrateDocument — the version-3 path", () => {
	test("the v3 blob gains the theme field as explicitly absent, keeping every other field", () => {
		const captured = fixture(V3_DOCUMENT_JSON);
		expect(captured[SETTING_KEYS.dataVersion]).toBe(SETTINGS_BASE_VERSION + 3);
		expect(SETTING_KEYS.theme in captured).toBe(false);
		const outcome = migrateDocument(captured);
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(outcome.document[SETTING_KEYS.dataVersion]).toBe(SETTINGS_BASE_VERSION + 5);
		expect(outcome.document[SETTING_KEYS.theme]).toBeNull();
		expect(outcome.document[SETTING_KEYS.transcriptScroll]).toEqual(
			captured[SETTING_KEYS.transcriptScroll],
		);
		expect(outcome.document[SETTING_KEYS.fonts]).toEqual(captured[SETTING_KEYS.fonts]);
	});

	test("a v3 blob already carrying a theme is not clobbered by the step", () => {
		const outcome = migrateDocument({
			[SETTING_KEYS.dataVersion]: SETTINGS_BASE_VERSION + 3,
			[SETTING_KEYS.theme]: "gruvbox",
		});
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(outcome.document[SETTING_KEYS.theme]).toBe("gruvbox");
	});

	test("a v3 blob with a theme field of the wrong type still walks to this version", () => {
		const outcome = migrateDocument({
			[SETTING_KEYS.dataVersion]: SETTINGS_BASE_VERSION + 3,
			[SETTING_KEYS.theme]: 7,
		});
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		// The step does not interpret the field: normalization is the model's job,
		// and `model.test.ts` proves a non-string theme reads as the default.
		expect(outcome.document[SETTING_KEYS.theme]).toBe(7);
	});
});

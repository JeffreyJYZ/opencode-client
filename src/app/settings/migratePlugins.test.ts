import { describe, expect, test } from "bun:test";
import { migrateDocument } from "@/app/settings/migrate";
import { freshDocument, type SettingsDocument } from "@/app/settings/model";
import { SETTING_KEYS, SETTINGS_BASE_VERSION } from "@/constants/settings";
import { V4_DOCUMENT_JSON } from "@/test/settings";

/**
 * The v4 → v5 step (M4.10), which exists for `settings.pluginsEnabled`. The
 * fixture is `V4_DOCUMENT_JSON`, **derived** — the writer's own fields minus the
 * one field v5 added — because no release's v4 blob was captured for it.
 */

function fixture(json: string): SettingsDocument {
	return JSON.parse(json) as SettingsDocument;
}

describe("migrateDocument — the version-4 path", () => {
	test("the v4 blob gains pluginsEnabled as explicitly off, keeping every other field", () => {
		const captured = fixture(V4_DOCUMENT_JSON);
		expect(captured[SETTING_KEYS.dataVersion]).toBe(SETTINGS_BASE_VERSION + 4);
		expect(SETTING_KEYS.pluginsEnabled in captured).toBe(false);
		const outcome = migrateDocument(captured);
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(outcome.document[SETTING_KEYS.pluginsEnabled]).toBe(false);
		expect(outcome.document[SETTING_KEYS.theme]).toEqual(captured[SETTING_KEYS.theme]);
		// The migrated document is exactly the shape this writer produces.
		expect(Object.keys(outcome.document)).toEqual(Object.keys(freshDocument()));
	});

	test("a v4 blob already carrying pluginsEnabled is not clobbered by the step", () => {
		const outcome = migrateDocument({
			[SETTING_KEYS.dataVersion]: SETTINGS_BASE_VERSION + 4,
			[SETTING_KEYS.pluginsEnabled]: true,
		});
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(outcome.document[SETTING_KEYS.pluginsEnabled]).toBe(true);
	});
});

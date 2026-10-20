import { describe, expect, test } from "bun:test";
import { migrateDocument } from "@/app/settings/migrate";
import { freshDocument, type SettingsDocument } from "@/app/settings/model";
import { SETTING_KEYS, SETTINGS_BASE_VERSION } from "@/constants/settings";
import { V5_DOCUMENT_JSON } from "@/test/settings";

/**
 * The v5 → v6 step (M5.6), which exists for `settings.dismissedUpdateVersion`.
 * The fixture is `V5_DOCUMENT_JSON`, **derived** — the writer's own fields minus
 * the one field v6 added — because no release's v5 blob was captured.
 */

function fixture(json: string): SettingsDocument {
	return JSON.parse(json) as SettingsDocument;
}

describe("migrateDocument — the version-5 path", () => {
	test("the v5 blob gains dismissedUpdateVersion as explicitly absent", () => {
		const captured = fixture(V5_DOCUMENT_JSON);
		expect(captured[SETTING_KEYS.dataVersion]).toBe(SETTINGS_BASE_VERSION + 5);
		expect(SETTING_KEYS.dismissedUpdateVersion in captured).toBe(false);
		const outcome = migrateDocument(captured);
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(outcome.document[SETTING_KEYS.dismissedUpdateVersion]).toBeNull();
		expect(outcome.document[SETTING_KEYS.pluginsEnabled]).toEqual(
			captured[SETTING_KEYS.pluginsEnabled],
		);
		// The migrated document is exactly the shape this writer produces.
		expect(Object.keys(outcome.document)).toEqual(Object.keys(freshDocument()));
	});

	test("a v5 blob already carrying dismissedUpdateVersion is not clobbered", () => {
		const outcome = migrateDocument({
			[SETTING_KEYS.dataVersion]: SETTINGS_BASE_VERSION + 5,
			[SETTING_KEYS.dismissedUpdateVersion]: "1.2.0",
		});
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(outcome.document[SETTING_KEYS.dismissedUpdateVersion]).toBe("1.2.0");
	});
});

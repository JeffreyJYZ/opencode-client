import { describe, expect, test } from "bun:test";
import { migrateDocument, type SettingsMigration } from "@/app/settings/migrate";
import type { SettingsDocument } from "@/app/settings/model";
import {
	LEGACY_ACTIVE_TAB_KEY,
	SETTING_KEYS,
	SETTINGS_BASE_VERSION,
	SETTINGS_DATA_VERSION,
	SETTINGS_MIGRATION_LIMIT,
} from "@/constants/settings";
import { V0_DOCUMENT_JSON, V1_DOCUMENT_JSON } from "@/test/settings";

/** Parse a fixture the way `storage.ts` does, so the test starts from raw text. */
function fixture(json: string): SettingsDocument {
	return JSON.parse(json) as SettingsDocument;
}

describe("migrateDocument — the version-0 path", () => {
	test("the strip's session ids become tab objects and the settings view stays one tab", () => {
		const outcome = migrateDocument(fixture(V0_DOCUMENT_JSON));
		expect(outcome.kind).toBe("ok");
		if (outcome.kind !== "ok") return;
		expect(outcome.document[SETTING_KEYS.tabs]).toEqual({
			tabs: [
				{ kind: "session", id: "ses_legacy_a" },
				{ kind: "settings" },
				{ kind: "session", id: "ses_legacy_b" },
			],
			activeIndex: 1,
		});
		expect(outcome.document[SETTING_KEYS.dataVersion]).toBe(SETTINGS_DATA_VERSION);
	});

	test("a field this build does not know survives the migration", () => {
		const outcome = migrateDocument(fixture(V0_DOCUMENT_JSON));
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(outcome.document.pluginsEnabled).toBe(true);
		expect(outcome.document[SETTING_KEYS.lastRoute]).toBe("/session/ses_legacy_a");
		expect(outcome.document[SETTING_KEYS.recentDirectories]).toEqual(["/tmp/legacy"]);
	});

	test("a version-0 blob whose tab list is the wrong type migrates to an empty strip", () => {
		const outcome = migrateDocument({ tabs: "ses_broken", [LEGACY_ACTIVE_TAB_KEY]: 4 });
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(outcome.document[SETTING_KEYS.tabs]).toEqual({ tabs: [], activeIndex: 4 });
	});
});

describe("migrateDocument — the version-1 path, from the captured blob", () => {
	// The fixture is `V1_DOCUMENT_JSON`: captured verbatim from the M1.5 app's
	// `localStorage` (see `src/test/settings.ts`), never transcribed. The standing
	// rule: from v1 onward every migration fixture is a real captured payload.
	test("the captured v1 blob gains the server field and keeps every other field", () => {
		const captured = fixture(V1_DOCUMENT_JSON);
		expect(captured[SETTING_KEYS.dataVersion]).toBe(SETTINGS_BASE_VERSION + 1);
		const outcome = migrateDocument(captured);
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(outcome.document[SETTING_KEYS.dataVersion]).toBe(SETTINGS_DATA_VERSION);
		expect(outcome.document[SETTING_KEYS.server]).toBeNull();
		expect(outcome.document[SETTING_KEYS.tabs]).toEqual(captured[SETTING_KEYS.tabs]);
		expect(outcome.document[SETTING_KEYS.lastOpened]).toBe(captured[SETTING_KEYS.lastOpened]);
		expect(outcome.document[SETTING_KEYS.fonts]).toEqual(captured[SETTING_KEYS.fonts]);
		expect(outcome.document[SETTING_KEYS.sidebar]).toEqual(captured[SETTING_KEYS.sidebar]);
	});

	test("a v1 blob already carrying a server field is not clobbered by the step", () => {
		const stored = { url: "http://kept:1", password: "pw" };
		const outcome = migrateDocument({
			[SETTING_KEYS.dataVersion]: SETTINGS_BASE_VERSION + 1,
			[SETTING_KEYS.server]: stored,
		});
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(outcome.document[SETTING_KEYS.server]).toEqual(stored);
	});
});

describe("migrateDocument — the version rules", () => {
	test("a blob already at this build's version is returned untouched, without running a step", () => {
		const document = { [SETTING_KEYS.dataVersion]: SETTINGS_DATA_VERSION, marker: "kept" };
		const outcome = migrateDocument(document);
		if (outcome.kind !== "ok") throw new Error("expected a usable document");
		expect(outcome.document).toBe(document);
	});

	test("a blob from a newer build is refused, not migrated down", () => {
		expect(
			migrateDocument({ [SETTING_KEYS.dataVersion]: SETTINGS_DATA_VERSION + 1 }).kind,
		).toBe("newer");
		expect(migrateDocument({ [SETTING_KEYS.dataVersion]: 99 }).kind).toBe("newer");
	});

	test("a dataVersion that is not a whole number is unreadable, never guessed at", () => {
		expect(migrateDocument({ [SETTING_KEYS.dataVersion]: "1" }).kind).toBe("unreadable");
		expect(migrateDocument({ [SETTING_KEYS.dataVersion]: 1.5 }).kind).toBe("unreadable");
		expect(migrateDocument({ [SETTING_KEYS.dataVersion]: -1 }).kind).toBe("unreadable");
	});

	test("the chain runs one step per version, in order, and stamps each one", () => {
		const trace: number[] = [];
		const registry: Record<number, SettingsMigration> = {
			[SETTINGS_BASE_VERSION]: (document) => {
				trace.push(SETTINGS_BASE_VERSION);
				return { ...document, first: true };
			},
			[SETTINGS_BASE_VERSION + 1]: (document) => {
				trace.push(SETTINGS_BASE_VERSION + 1);
				return { ...document, second: true };
			},
		};
		const outcome = migrateDocument({}, registry, SETTINGS_BASE_VERSION + 2);
		if (outcome.kind !== "ok") throw new Error("expected a migrated document");
		expect(trace).toEqual([SETTINGS_BASE_VERSION, SETTINGS_BASE_VERSION + 1]);
		expect(outcome.document[SETTING_KEYS.dataVersion]).toBe(SETTINGS_BASE_VERSION + 2);
		expect(outcome.document.first).toBe(true);
		expect(outcome.document.second).toBe(true);
	});

	test("a missing step is unreadable rather than a silent skip", () => {
		expect(migrateDocument({}, {}, SETTINGS_BASE_VERSION + 1).kind).toBe("unreadable");
	});

	test("a chain longer than the limit stops instead of walking forever", () => {
		const registry: Record<number, SettingsMigration> = {};
		const target = SETTINGS_MIGRATION_LIMIT + 4;
		for (let version = 0; version < target; version++) registry[version] = (doc) => doc;
		expect(migrateDocument({}, registry, target).kind).toBe("unreadable");
	});
});

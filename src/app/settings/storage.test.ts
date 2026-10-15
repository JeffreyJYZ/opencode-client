import { describe, expect, test } from "bun:test";
import { DEFAULT_SETTINGS, freshDocument, settingsFromDocument } from "@/app/settings/model";
import { readStoredSettings, writeStoredSettings } from "@/app/settings/storage";
import { SETTING_KEYS, SETTINGS_DATA_VERSION, SETTINGS_STORAGE_KEY } from "@/constants/settings";
import {
	CORRUPT_DOCUMENT_JSON,
	fakeStorage,
	TOO_NEW_DOCUMENT_JSON,
	V0_DOCUMENT_JSON,
	V1_DOCUMENT_JSON,
} from "@/test/settings";

describe("readStoredSettings", () => {
	test("nothing stored is the defaults with no notice", () => {
		const load = readStoredSettings(fakeStorage());
		expect(settingsFromDocument(load.document)).toEqual(DEFAULT_SETTINGS);
		expect(load.notice).toBeNull();
		expect(load.readOnly).toBe(false);
	});

	test("a blob this build wrote loads as it stands", () => {
		const load = readStoredSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: V1_DOCUMENT_JSON }));
		expect(load.notice).toBeNull();
		expect(settingsFromDocument(load.document).lastRoute).toBe("/settings");
	});

	test("the version-0 layout is migrated on read, and nothing is written back yet", () => {
		const storage = fakeStorage({ [SETTINGS_STORAGE_KEY]: V0_DOCUMENT_JSON });
		const load = readStoredSettings(storage);
		expect(load.notice).toBeNull();
		expect(load.document[SETTING_KEYS.dataVersion]).toBe(SETTINGS_DATA_VERSION);
		expect(settingsFromDocument(load.document).tabs.tabs).toEqual([
			{ kind: "session", id: "ses_legacy_a" },
			{ kind: "settings" },
			{ kind: "session", id: "ses_legacy_b" },
		]);
		// A read is a read: the disk keeps the payload it had until a change is made.
		expect(storage.entries()[SETTINGS_STORAGE_KEY]).toBe(V0_DOCUMENT_JSON);
	});

	test("unparseable text is unreadable, writable, and named", () => {
		const load = readStoredSettings(
			fakeStorage({ [SETTINGS_STORAGE_KEY]: CORRUPT_DOCUMENT_JSON }),
		);
		expect(load.notice?.id).toBe("unreadable");
		expect(load.readOnly).toBe(false);
		expect(settingsFromDocument(load.document)).toEqual(DEFAULT_SETTINGS);
	});

	test("a JSON value that is not an object is unreadable", () => {
		expect(
			readStoredSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: "[1,2,3]" })).notice?.id,
		).toBe("unreadable");
		expect(readStoredSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: "null" })).notice?.id).toBe(
			"unreadable",
		);
	});

	test("a newer build's blob is refused and marked read-only, never migrated down", () => {
		const load = readStoredSettings(
			fakeStorage({ [SETTINGS_STORAGE_KEY]: TOO_NEW_DOCUMENT_JSON }),
		);
		expect(load.notice?.id).toBe("newer");
		expect(load.readOnly).toBe(true);
		expect(settingsFromDocument(load.document)).toEqual(DEFAULT_SETTINGS);
	});

	test("blank stored text is the same as nothing stored", () => {
		const load = readStoredSettings(fakeStorage({ [SETTINGS_STORAGE_KEY]: "   " }));
		expect(load.notice).toBeNull();
		expect(settingsFromDocument(load.document)).toEqual(DEFAULT_SETTINGS);
	});

	test("the captured fixture is still the shape the writer produces", () => {
		// The M1.4 lesson: a fixture that models a shape the code cannot produce
		// proves nothing. This fails the moment the writer's fields drift.
		expect(Object.keys(JSON.parse(V1_DOCUMENT_JSON))).toEqual(Object.keys(freshDocument()));
	});
});

describe("writeStoredSettings", () => {
	test("round-trips a document through the key it belongs under", () => {
		const storage = fakeStorage();
		writeStoredSettings(storage, {
			[SETTING_KEYS.dataVersion]: SETTINGS_DATA_VERSION,
			marker: 1,
		});
		const again = readStoredSettings(storage);
		expect(again.document.marker).toBe(1);
		expect(again.notice).toBeNull();
	});
});

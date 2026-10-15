import { migrateDocument } from "@/app/settings/migrate";
import {
	freshDocument,
	isRecord,
	type SettingsDocument,
	type SettingsNotice,
} from "@/app/settings/model";
import {
	SETTINGS_NOTICE_KIND,
	SETTINGS_NOTICE_TEXT,
	SETTINGS_STORAGE_KEY,
} from "@/constants/settings";

/**
 * The blob on disk: `localStorage`, synchronously, so the restore can happen
 * before the first paint (spec 010 §Persistence). No new runtime dependency is
 * allowed, so the Tauri store plugin is not an option; a webview's
 * `localStorage` is per-origin, which is exactly one app's settings.
 */

export type SettingsStorage = {
	readonly read: (key: string) => string | null;
	readonly write: (key: string, value: string) => void;
	readonly remove: (key: string) => void;
};

export type SettingsLoad = {
	readonly document: SettingsDocument;
	/** Set when the stored blob could not be used. */
	readonly notice: SettingsNotice | null;
	/** True when a newer build's blob is on disk: this session must not write. */
	readonly readOnly: boolean;
};

const UNREADABLE_NOTICE: SettingsNotice = {
	id: SETTINGS_NOTICE_KIND.unreadable,
	message: SETTINGS_NOTICE_TEXT.unreadable,
};

const NEWER_NOTICE: SettingsNotice = {
	id: SETTINGS_NOTICE_KIND.newer,
	message: SETTINGS_NOTICE_TEXT.newer,
};

/** `localStorage` when the page has a usable one; `null` otherwise (never a throw). */
export function browserStorage(): SettingsStorage | null {
	try {
		const store = globalThis.localStorage;
		if (store === undefined || store === null) return null;
		return {
			read: (key) => store.getItem(key),
			write: (key, value) => {
				store.setItem(key, value);
			},
			remove: (key) => {
				store.removeItem(key);
			},
		};
	} catch {
		return null;
	}
}

function parseDocument(raw: string): SettingsDocument | null {
	try {
		const value: unknown = JSON.parse(raw);
		return isRecord(value) ? value : null;
	} catch {
		return null;
	}
}

/**
 * Read and upgrade the blob. Three outcomes the caller acts on: a usable
 * document, an unreadable blob (defaults in memory, disk rewritten on the next
 * change), or a **newer** blob (defaults in memory and the disk left untouched).
 */
export function readStoredSettings(storage: SettingsStorage): SettingsLoad {
	const raw = storage.read(SETTINGS_STORAGE_KEY);
	if (raw === null || raw.trim() === "") {
		return { document: freshDocument(), notice: null, readOnly: false };
	}
	const document = parseDocument(raw);
	if (document === null) {
		return { document: freshDocument(), notice: UNREADABLE_NOTICE, readOnly: false };
	}
	const outcome = migrateDocument(document);
	switch (outcome.kind) {
		case "ok":
			return { document: outcome.document, notice: null, readOnly: false };
		case "newer":
			return { document: freshDocument(), notice: NEWER_NOTICE, readOnly: true };
		case "unreadable":
			return { document: freshDocument(), notice: UNREADABLE_NOTICE, readOnly: false };
	}
}

export function writeStoredSettings(storage: SettingsStorage, document: SettingsDocument): void {
	storage.write(SETTINGS_STORAGE_KEY, JSON.stringify(document));
}

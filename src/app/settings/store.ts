import { hydrateLastOpenedSession } from "@/app/lastOpened";
import { applyAppearance } from "@/app/settings/appearance";
import { restoreLandingRoute } from "@/app/settings/landing";
import {
	DEFAULT_SETTINGS,
	freshDocument,
	type SettingsData,
	type SettingsDocument,
	type SettingsNotice,
	settingsFromDocument,
} from "@/app/settings/model";
import {
	browserStorage,
	readStoredSettings,
	type SettingsStorage,
	writeStoredSettings,
} from "@/app/settings/storage";
import { createSettingsSync } from "@/app/settings/sync";
import { hydrateTabState } from "@/app/tabs";
import { APP_EVENT } from "@/constants/plugins";
import { SETTING_KEYS, SETTINGS_DATA_VERSION, SETTINGS_STORAGE_KEY } from "@/constants/settings";
import { emitAppEvent } from "@/plugins/appEvents";

/**
 * The settings store: one in-memory document, one write path, one restore. No
 * React in it — `useSettings.ts` subscribes (the same shape `tabs.ts` uses).
 * The strip and the route are *read* from their own stores and written here, so
 * there is exactly one serializer for the blob (spec 010 §Persistence).
 *
 * `settings-changed` is emitted from the one write path (`publish`, M4.14), so a
 * plugin hears about every persisted change: a field the user set and a tab, route
 * or "last opened" the app folded in alike. The bridge that reads those three other
 * stores is `settings/sync.ts`; this file is the document and the write path.
 */

export type SettingsSnapshot = {
	readonly settings: SettingsData;
	readonly notice: SettingsNotice | null;
};

let storage: SettingsStorage | null = null;
let document: SettingsDocument = freshDocument();
let snapshot: SettingsSnapshot = { settings: DEFAULT_SETTINGS, notice: null };
let restored = false;
/** A newer build's blob is on disk: this session reads defaults and never writes. */
let suspended = false;
const listeners = new Set<() => void>();
const sync = createSettingsSync({ current: getSettings, apply });

export function getSettingsSnapshot(): SettingsSnapshot {
	return snapshot;
}

export function getSettings(): SettingsData {
	return snapshot.settings;
}

export function subscribeSettings(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

function publish(settings: SettingsData): void {
	snapshot = { settings, notice: snapshot.notice };
	emitAppEvent(APP_EVENT.settingsChanged, settings);
	for (const listener of [...listeners]) listener();
}

/** The one write path: fold fields into the document, then persist. */
function apply(fields: Partial<SettingsData>): void {
	document = { ...document, ...fields, [SETTING_KEYS.dataVersion]: SETTINGS_DATA_VERSION };
	const previous = snapshot.settings;
	const settings = settingsFromDocument(document);
	publish(settings);
	// An appearance change is applied live (M3.2 fonts, M3.4 theme); nothing else touches the root.
	applyAppearance(settings, previous);
	if (storage !== null && !suspended) writeStoredSettings(storage, document);
}

/** The public action the new-session flow (and M2.7/M3.2) call. */
export function updateSettings(fields: Partial<SettingsData>): void {
	apply(fields);
}

/**
 * Restore everything before the first paint (called from `main.tsx`). Idempotent,
 * so a hot reload or a second call cannot double-apply.
 *
 * A stored tab whose session no longer exists is **kept**: at restore time no
 * server round-trip has happened, so "unknown" and "deleted" are indistinguishable
 * and the route's own view reports it (spec 010 §Routes) — dropping it would need a
 * request before the first paint, which is exactly what this cannot do.
 */
export function restoreSettings(store: SettingsStorage | null = browserStorage()): void {
	if (restored) return;
	restored = true;
	storage = store;
	const load =
		storage === null
			? { document: freshDocument(), notice: null, readOnly: false }
			: readStoredSettings(storage);
	document = load.document;
	suspended = load.readOnly;
	snapshot = { settings: settingsFromDocument(document), notice: load.notice };
	applyAppearance(snapshot.settings);
	hydrateTabState(snapshot.settings.tabs);
	hydrateLastOpenedSession(snapshot.settings.lastOpened);
	restoreLandingRoute(snapshot.settings.lastRoute, snapshot.settings.tabs);
	sync.install();
}

/** The tests' reset; production never calls it. */
export function resetSettings(): void {
	sync.dispose();
	if (storage !== null) storage.remove(SETTINGS_STORAGE_KEY);
	storage = null;
	document = freshDocument();
	snapshot = { settings: DEFAULT_SETTINGS, notice: null };
	restored = false;
	suspended = false;
}

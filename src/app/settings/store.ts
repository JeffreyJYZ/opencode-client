import {
	getLastOpenedSessionId,
	hydrateLastOpenedSession,
	subscribeLastOpened,
} from "@/app/lastOpened";
import { currentRoute, routeToPath, subscribeToRoute } from "@/app/router";
import { restoreLandingRoute } from "@/app/settings/landing";
import {
	DEFAULT_SETTINGS,
	freshDocument,
	type SettingsData,
	type SettingsDocument,
	type SettingsNotice,
	settingsFromDocument,
} from "@/app/settings/model";
import { pruneTabScroll } from "@/app/settings/scroll";
import {
	browserStorage,
	readStoredSettings,
	type SettingsStorage,
	writeStoredSettings,
} from "@/app/settings/storage";
import { sameTabs } from "@/app/settings/tabState";
import { tabKey } from "@/app/tabModel";
import { hydrateTabState, serializeTabState, subscribeToTabs } from "@/app/tabs";
import { SETTING_KEYS, SETTINGS_DATA_VERSION, SETTINGS_STORAGE_KEY } from "@/constants/settings";
import { applyFonts } from "@/theme/fonts";

/**
 * The settings store: one in-memory document, one write path, one restore. No
 * React in it — `useSettings.ts` subscribes (the same shape `tabs.ts` uses).
 *
 * The strip and the route are *read* from their own stores and written here, so
 * there is exactly one serializer for the blob (spec 010 §Persistence, the
 * brief's "writing must not fight the tab store").
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
const disposers: Array<() => void> = [];
const listeners = new Set<() => void>();

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
	for (const listener of [...listeners]) listener();
}

/** The one write path: fold fields into the document, then persist. */
function apply(fields: Partial<SettingsData>): void {
	document = { ...document, ...fields, [SETTING_KEYS.dataVersion]: SETTINGS_DATA_VERSION };
	publish(settingsFromDocument(document));
	if (storage !== null && !suspended) writeStoredSettings(storage, document);
}

/** The public action the new-session flow (and M2.7/M3.2) call. */
export function updateSettings(fields: Partial<SettingsData>): void {
	apply(fields);
}

function installSync(): void {
	disposers.push(subscribeToTabs(syncTabs));
	disposers.push(subscribeToRoute(syncRoute));
	disposers.push(subscribeLastOpened(syncLastOpened));
}

function syncTabs(): void {
	const tabs = serializeTabState();
	// A closed tab releases its remembered position (M2.9): the strip is the set of
	// views that exist, so the blob holds a position for exactly those keys.
	const scroll = pruneTabScroll(getSettings().transcriptScroll, tabs.tabs.map(tabKey));
	const tabsChanged = !sameTabs(tabs, snapshot.settings.tabs);
	if (!tabsChanged && scroll === getSettings().transcriptScroll) return;
	apply(tabsChanged ? { tabs, transcriptScroll: scroll } : { transcriptScroll: scroll });
}

function syncRoute(): void {
	const path = routeToPath(currentRoute());
	if (path === snapshot.settings.lastRoute) return;
	apply({ lastRoute: path });
}

function syncLastOpened(): void {
	const id = getLastOpenedSessionId();
	if (id === snapshot.settings.lastOpened) return;
	apply({ lastOpened: id });
}

/**
 * Restore everything before the first paint (called from `main.tsx`). Idempotent,
 * so a hot reload or a second call cannot double-apply.
 *
 * A stored tab whose session no longer exists is **kept**: at restore time no
 * server round-trip has happened, so "unknown to the server" and "deleted" are
 * indistinguishable, and the route's own session view is the surface that
 * reports it (spec 010 §Routes: an unknown id renders the same "no session"
 * state as home's empty case). Dropping it instead would need a request before
 * the first paint, which is exactly what this cannot do.
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
	applyFonts(snapshot.settings.fonts);
	hydrateTabState(snapshot.settings.tabs);
	hydrateLastOpenedSession(snapshot.settings.lastOpened);
	restoreLandingRoute(snapshot.settings.lastRoute, snapshot.settings.tabs);
	installSync();
}

/** The tests' reset; production never calls it. */
export function resetSettings(): void {
	for (const dispose of disposers.splice(0)) dispose();
	if (storage !== null) storage.remove(SETTINGS_STORAGE_KEY);
	storage = null;
	document = freshDocument();
	snapshot = { settings: DEFAULT_SETTINGS, notice: null };
	restored = false;
	suspended = false;
}

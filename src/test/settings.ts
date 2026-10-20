import { hydrateLastOpenedSession } from "@/app/lastOpened";
import { freshDocument } from "@/app/settings/model";
import type { SettingsStorage } from "@/app/settings/storage";
import { resetSettings } from "@/app/settings/store";
import type { Tab } from "@/app/tabModel";
import { getTabSnapshot, resetTabs } from "@/app/tabs";
import { ROUTE_PATH } from "@/constants/routes";
import {
	SETTING_KEYS,
	SETTINGS_BASE_VERSION,
	SETTINGS_DATA_VERSION,
	SETTINGS_STORAGE_KEY,
} from "@/constants/settings";

/**
 * Settings fixtures: the *shapes* a stored blob really takes, kept in one place
 * so a test cannot quietly assert a document nothing writes.
 *
 * `V0_DOCUMENT_JSON` is the layout spec 010 §Persistence's table describes —
 * `settings.tabs` as "session ids, plus the settings view while it is open" —
 * which is what a pre-versioning cell held; `pluginsEnabled` rides along to
 * prove a field this build does not know survives the migration. **No shipped
 * release ever wrote it** (nothing in this repo persisted before M1.5); it is
 * transcribed from the spec's own key table, and `migrate.test.ts` says so.
 *
 * `V1_DOCUMENT_JSON` is **captured verbatim from the running app**: the M1.5
 * browser proof read it straight out of `localStorage` after a session was
 * created and the settings tab opened (`M1.5-report.md`). Key order included.
 */
export const V0_DOCUMENT_JSON =
	'{"tabs":["ses_legacy_a","settings","ses_legacy_b"],"activeIndex":1,"lastRoute":"/session/ses_legacy_a","recentDirectories":["/tmp/legacy"],"pluginsEnabled":true}';

export const V1_DOCUMENT_JSON =
	'{"dataVersion":1,"tabs":{"tabs":[{"kind":"session","id":"ses_ec0af5a77ffeOKCjOv2X011ZYQ"},{"kind":"settings"}],"activeIndex":1},"lastRoute":"/settings","lastOpened":"ses_ec0af5a77ffeOKCjOv2X011ZYQ","sidebar":{"visible":true,"width":260},"fonts":{"ui":{"family":"Geist","size":15},"code":{"family":"GeistMono Nerd Font","size":13}},"recentDirectories":["/Users/jyz/dev/resources/m15-settings-proof/project"]}';

/** A blob whose JSON does not parse. */
export const CORRUPT_DOCUMENT_JSON = '{"tabs": ["ses_a",';

/** A blob a newer build wrote: preserved, never migrated down, never overwritten. */
export const TOO_NEW_DOCUMENT_JSON = '{"dataVersion":99,"tabs":{"tabs":[],"activeIndex":-1}}';

/**
 * A version-3 blob — **derived, not captured**: the current writer's fields minus
 * every field a later version added (`theme`, M3.4; `pluginsEnabled`, M4.10;
 * `dismissedUpdateVersion`, M5.6), restamped to 3. The captured v1 blob above is
 * the migration path's real fixture; this one exists so the v3 → v4 step has a
 * shape to walk, and it says so here rather than passing for a payload some
 * release wrote.
 */
export const V3_DOCUMENT_JSON: string = JSON.stringify({
	...Object.fromEntries(
		Object.entries(freshDocument()).filter(
			([key]) =>
				key !== SETTING_KEYS.theme &&
				key !== SETTING_KEYS.pluginsEnabled &&
				key !== SETTING_KEYS.dismissedUpdateVersion,
		),
	),
	[SETTING_KEYS.dataVersion]: SETTINGS_BASE_VERSION + 3,
});

/**
 * A version-4 blob — **derived, not captured**: the current writer's fields minus
 * the fields v5 and v6 added (`pluginsEnabled`, `dismissedUpdateVersion`),
 * restamped to 4, so the v4 → v5 step has a shape to walk (M4.10).
 */
export const V4_DOCUMENT_JSON: string = JSON.stringify({
	...Object.fromEntries(
		Object.entries(freshDocument()).filter(
			([key]) =>
				key !== SETTING_KEYS.pluginsEnabled && key !== SETTING_KEYS.dismissedUpdateVersion,
		),
	),
	[SETTING_KEYS.dataVersion]: SETTINGS_BASE_VERSION + 4,
});

/**
 * A version-5 blob — **derived, not captured**: the current writer's fields minus
 * the one field v6 added (`dismissedUpdateVersion`), restamped to 5, so the
 * v5 → v6 step has a shape to walk (M5.6).
 */
export const V5_DOCUMENT_JSON: string = JSON.stringify({
	...Object.fromEntries(
		Object.entries(freshDocument()).filter(
			([key]) => key !== SETTING_KEYS.dismissedUpdateVersion,
		),
	),
	[SETTING_KEYS.dataVersion]: SETTINGS_BASE_VERSION + 5,
});

/** A map-backed storage, so a test never touches the run's real `localStorage`. */
export function fakeStorage(
	initial: Record<string, string> = {},
): SettingsStorage & { entries: () => Record<string, string> } {
	const map = new Map(Object.entries(initial));
	return {
		read: (key) => map.get(key) ?? null,
		write: (key, value) => {
			map.set(key, value);
		},
		remove: (key) => {
			map.delete(key);
		},
		entries: () => Object.fromEntries(map),
	};
}

/** A stored blob at the current version, from the fields a test cares about. */
export function blobDocument(fields: Record<string, unknown> = {}): string {
	return JSON.stringify({ [SETTING_KEYS.dataVersion]: SETTINGS_DATA_VERSION, ...fields });
}

/** The strip's ids, or the settings tab's own name. */
export function openTabIds(): Array<string> {
	return getTabSnapshot().tabs.map((tab: Tab) => (tab.kind === "session" ? tab.id : tab.kind));
}

/** Everything the settings store and the tab store must be back to before a test. */
export function resetSettingsState(): void {
	resetSettings();
	resetTabs();
	hydrateLastOpenedSession(null);
	window.history.pushState(null, "", ROUTE_PATH.home);
}

export { SETTINGS_STORAGE_KEY };

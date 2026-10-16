import { getLastOpenedSessionId, subscribeLastOpened } from "@/app/lastOpened";
import { currentRoute, routeToPath, subscribeToRoute } from "@/app/router";
import type { SettingsData } from "@/app/settings/model";
import { pruneTabScroll } from "@/app/settings/scroll";
import { sameTabs } from "@/app/settings/tabState";
import { tabKey } from "@/app/tabModel";
import { serializeTabState, subscribeToTabs } from "@/app/tabs";

/**
 * The bridge from the app's three other stores into the settings document (spec 010
 * §Persistence): the tab strip, the route and "continue where you left off" are
 * *read* from their own stores and folded into the blob through the store's one
 * write path, so there is exactly one serializer for it.
 *
 * Split from the store itself (M4.14): the document and the write path are one
 * responsibility, this bridge is another, and the store was at the file cap. It
 * holds its own disposers, so the store's reset disposes them with one call.
 */

export type SettingsSyncDeps = {
	/** The settings now in memory; the comparison the three syncs make. */
	readonly current: () => SettingsData;
	/** The store's one write path. */
	readonly apply: (fields: Partial<SettingsData>) => void;
};

export type SettingsSync = {
	install: () => void;
	dispose: () => void;
};

export function createSettingsSync(deps: SettingsSyncDeps): SettingsSync {
	const disposers: Array<() => void> = [];

	function syncTabs(): void {
		const tabs = serializeTabState();
		// A closed tab releases its remembered position (M2.9): the blob holds one for
		// exactly the strip's keys.
		const scroll = pruneTabScroll(deps.current().transcriptScroll, tabs.tabs.map(tabKey));
		const tabsChanged = !sameTabs(tabs, deps.current().tabs);
		if (!tabsChanged && scroll === deps.current().transcriptScroll) return;
		deps.apply(tabsChanged ? { tabs, transcriptScroll: scroll } : { transcriptScroll: scroll });
	}

	function syncRoute(): void {
		const path = routeToPath(currentRoute());
		if (path === deps.current().lastRoute) return;
		deps.apply({ lastRoute: path });
	}

	function syncLastOpened(): void {
		const id = getLastOpenedSessionId();
		if (id === deps.current().lastOpened) return;
		deps.apply({ lastOpened: id });
	}

	return {
		install(): void {
			disposers.push(subscribeToTabs(syncTabs));
			disposers.push(subscribeToRoute(syncRoute));
			disposers.push(subscribeLastOpened(syncLastOpened));
		},
		dispose(): void {
			for (const dispose of disposers.splice(0)) dispose();
		},
	};
}

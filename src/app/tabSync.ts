import { useEffect } from "react";
import { setLastOpenedSession } from "@/app/lastOpened";
import { navigate, type Route, sessionRoute, settingsRoute } from "@/app/router";
import { sameTab } from "@/app/tabModel";
import {
	activateTab,
	closeOtherTabs,
	closeTab,
	getTabSnapshot,
	openTab,
	type Tab,
} from "@/app/tabs";
import { useRoute } from "@/app/useRoute";
import { ROUTE_KIND } from "@/constants/routes";
import {
	COMMAND_PALETTE_EVENT,
	NEW_SESSION_EVENT,
	SESSION_PICKER_EVENT,
	TAB_KIND,
} from "@/constants/tabs";

/**
 * Where the router and the tab store meet (spec 010 §Routes, decided rule: the
 * settings view is a tab *while* it is open, and no settings tab sits in the
 * strip while it is closed).
 *
 * Sync runs route → tabs only. Tab clicks and closes navigate explicitly, so
 * there is no loop for history to fight: back/forward change the route, the
 * route ensures its tab exists, and the strip never navigates on its own.
 */

export function tabToRoute(tab: Tab): Route {
	return tab.kind === TAB_KIND.settings ? settingsRoute() : sessionRoute(tab.id);
}

/** Open the view a route names, idempotently; home owns no tab. */
export function ensureTabForRoute(route: Route): void {
	if (route.kind === ROUTE_KIND.session) {
		openTab({ kind: TAB_KIND.session, id: route.id });
	} else if (route.kind === ROUTE_KIND.settings) {
		openTab({ kind: TAB_KIND.settings });
	}
}

/** Every render follows the route; opening is idempotent, so this is cheap. */
export function useTabRouteSync(): void {
	const route = useRoute();
	useEffect(() => {
		ensureTabForRoute(route);
	}, [route]);
}

/** Activate a tab and land on its route. */
export function activateTabAndGo(tab: Tab): void {
	activateTab(tab);
	navigate(tabToRoute(tab));
}

/**
 * Open a session view through the store and land on it. One path for every
 * opener — a recents row, the picker and the palette all go through here, so a
 * new opener cannot forget the "continue where you left off" bookkeeping.
 */
export function openSessionAndGo(id: string): void {
	setLastOpenedSession(id);
	const tab: Tab = { kind: TAB_KIND.session, id };
	openTab(tab);
	activateTabAndGo(tab);
}

/** Open the settings view as a tab and land on it (spec 010 §Routes). */
export function openSettingsAndGo(): void {
	const tab: Tab = { kind: TAB_KIND.settings };
	openTab(tab);
	activateTabAndGo(tab);
}

/**
 * Close a tab and land where the strip did: the neighbour the store activated,
 * or home when the strip is empty. Closing never touches the server.
 */
export function closeTabAndGo(tab: Tab): void {
	const before = getTabSnapshot();
	const wasActive = before.activeIndex >= 0 && sameTab(before.tabs[before.activeIndex], tab);
	closeTab(tab);
	if (!wasActive) return;
	const after = getTabSnapshot();
	const next = after.activeIndex >= 0 ? after.tabs[after.activeIndex] : undefined;
	navigate(next === undefined ? { kind: ROUTE_KIND.home } : tabToRoute(next));
}

/** Close the active tab, if there is one. ⌘W's action. */
export function closeActiveTabAndGo(): void {
	const snapshot = getTabSnapshot();
	const active = snapshot.activeIndex >= 0 ? snapshot.tabs[snapshot.activeIndex] : undefined;
	if (active !== undefined) closeTabAndGo(active);
}

/**
 * Close every tab but `keep`, and land on it. ⌘⌥W's action and the tab menu's
 * second item: the store's `closeOtherTabs` keeps the tab, and the route follows
 * because the tab that was on screen may be one of the closed ones.
 */
export function closeOtherTabsAndGo(keep: Tab): void {
	closeOtherTabs(keep);
	navigate(tabToRoute(keep));
}

/** The ⌘⌥W action's active-tab form: the menu item passes its own tab instead. */
export function closeOtherActiveTabsAndGo(): void {
	const snapshot = getTabSnapshot();
	const active = snapshot.activeIndex >= 0 ? snapshot.tabs[snapshot.activeIndex] : undefined;
	if (active !== undefined) closeOtherTabsAndGo(active);
}

/** Switch to the strip position, when one sits there. ⌘1…⌘9's action. */
export function switchTabAndGo(index: number): void {
	const tab = getTabSnapshot().tabs[index];
	if (tab !== undefined) activateTabAndGo(tab);
}

/**
 * The `+` button and ⌘T's signal. M1.3 listens for it and creates the session;
 * here it is the affordance, documented rather than faked.
 */
export function requestNewSession(): void {
	window.dispatchEvent(new CustomEvent(NEW_SESSION_EVENT));
}

/** The `⌕` button's signal; M1.4's picker listens for it. */
export function requestSessionPicker(): void {
	window.dispatchEvent(new CustomEvent(SESSION_PICKER_EVENT));
}

/** The ⌘K palette's signal; the palette toggles on it and closes the other overlays. */
export function requestCommandPalette(): void {
	window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));
}

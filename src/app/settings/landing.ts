import { currentPath, pathToRoute, type Route, replaceRoute } from "@/app/router";
import { type SerializedTabs, sessionTab, settingsTab, type Tab } from "@/app/tabModel";
import { openTab } from "@/app/tabs";
import { ROUTE_KIND } from "@/constants/routes";
import { TAB_KIND } from "@/constants/tabs";

/**
 * Where the app lands after a restore (spec 010 §Persistence: `settings.lastRoute`
 * is "where to land on next launch").
 *
 * **An explicit path wins.** The document's own path is the first authority: a
 * real route there is the landing, and `settings.lastRoute` is only the fallback
 * for "no explicit path" (`/`). Before M1.5b the stored route was read first, so
 * a deep link to `/session/:id` was silently replaced by whatever was stored last
 * — found by using the app (M2.2), not by a test.
 *
 * A stored route is honoured only when the restored strip can actually serve it,
 * because a route with no tab would be a shell whose URL names a view the strip
 * does not show. An **explicit** path is not gated the same way: a deep link the
 * strip cannot serve **opens its own tab** (never "refuse and stay", which is how
 * a deep link gets silently ignored), so the strip and the URL agree in the first
 * painted frame.
 */

/** A route that owns a tab — home owns none. */
type ViewRoute = Extract<
	Route,
	{ readonly kind: typeof ROUTE_KIND.session | typeof ROUTE_KIND.settings }
>;

export function hasTabFor(path: string, strip: SerializedTabs): boolean {
	const route = pathToRoute(path);
	if (route === null) return false;
	if (route.kind === ROUTE_KIND.home) return true;
	if (route.kind === ROUTE_KIND.settings) {
		return strip.tabs.some((tab) => tab.kind === TAB_KIND.settings);
	}
	return strip.tabs.some((tab) => tab.kind === TAB_KIND.session && tab.id === route.id);
}

/** The tab a view route is shown in. */
function tabFor(route: ViewRoute): Tab {
	return route.kind === ROUTE_KIND.session ? sessionTab(route.id) : settingsTab();
}

export function restoreLandingRoute(storedPath: string, strip: SerializedTabs): void {
	const path = currentPath();
	const explicit = pathToRoute(path);
	if (explicit !== null && explicit.kind !== ROUTE_KIND.home) {
		if (!hasTabFor(path, strip)) openTab(tabFor(explicit));
		replaceRoute(explicit);
		return;
	}
	if (!hasTabFor(storedPath, strip)) return;
	const route = pathToRoute(storedPath);
	if (route === null) return;
	replaceRoute(route);
}

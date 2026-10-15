import { pathToRoute, replaceRoute } from "@/app/router";
import type { SerializedTabs } from "@/app/tabModel";
import { ROUTE_KIND } from "@/constants/routes";
import { TAB_KIND } from "@/constants/tabs";

/**
 * Where the app lands after a restore (spec 010 §Persistence: `settings.lastRoute`
 * is "where to land on next launch"). A stored route is only honoured when the
 * restored strip can actually serve it, because a route with no tab would be a
 * shell whose URL names a view the strip does not show.
 */

export function hasTabFor(path: string, strip: SerializedTabs): boolean {
	const route = pathToRoute(path);
	if (route === null) return false;
	if (route.kind === ROUTE_KIND.home) return true;
	if (route.kind === ROUTE_KIND.settings) {
		return strip.tabs.some((tab) => tab.kind === TAB_KIND.settings);
	}
	return strip.tabs.some((tab) => tab.kind === TAB_KIND.session && tab.id === route.id);
}

export function restoreLandingRoute(path: string, strip: SerializedTabs): void {
	if (!hasTabFor(path, strip)) return;
	const route = pathToRoute(path);
	if (route === null) return;
	replaceRoute(route);
}

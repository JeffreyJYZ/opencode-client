import { useSyncExternalStore } from "react";
import {
	matchRegisteredRoute,
	type RouteContribution,
	subscribeToRouteRegistry,
} from "@/app/routeRegistry";
import { currentPath, currentRoute, type Route, subscribeToRoute } from "@/app/router";

/**
 * The only place a component subscribes to navigation (spec 010 §Routes). Both
 * hooks read a cached snapshot, because `useSyncExternalStore` compares by
 * identity and a fresh object per call would re-render forever.
 */

/** The current route; an unknown path has already been resolved to home. */
export function useRoute(): Route {
	return useSyncExternalStore(subscribeToRoute, currentRoute);
}

/** Navigation and the route registry both change what a path resolves to. */
function subscribeToNavigation(listener: () => void): () => void {
	const unsubscribeRoute = subscribeToRoute(listener);
	const unsubscribeRegistry = subscribeToRouteRegistry(listener);
	return () => {
		unsubscribeRoute();
		unsubscribeRegistry();
	};
}

/** The registered route serving the current path, or `null` for a built-in one. */
export function useRegisteredRoute(): RouteContribution | null {
	return useSyncExternalStore(subscribeToNavigation, () => matchRegisteredRoute(currentPath()));
}

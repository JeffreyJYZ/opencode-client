import { ROUTE_KIND, ROUTE_PATH, SESSION_PATH_PREFIX } from "@/constants/routes";

/**
 * The internal router (spec 010 §Routes): the history API plus `popstate`, no
 * router dependency. Nothing here touches React — `useRoute.ts` is the only
 * place a component subscribes to navigation.
 */

/** Where the app can be. Depth is two: a surface, and a session's own panels. */
export type Route =
	| { readonly kind: typeof ROUTE_KIND.home }
	| { readonly kind: typeof ROUTE_KIND.session; readonly id: string }
	| { readonly kind: typeof ROUTE_KIND.settings };

/**
 * NOTE: this allocates a fresh object every call. Safe only because `currentRoute()`
 * caches by path and returns the stored instance; a caller that reads this identity
 * in a dependency array would re-render forever. Prefer `currentRoute()` when
 * you need a stable identity.
 */
export function homeRoute(): Route {
	return { kind: ROUTE_KIND.home };
}

export function sessionRoute(id: string): Route {
	return { kind: ROUTE_KIND.session, id };
}

export function settingsRoute(): Route {
	return { kind: ROUTE_KIND.settings };
}

/** A path with a trailing separator removed, so `/settings/` still matches. */
export function normalizePath(path: string): string {
	return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function routeToPath(route: Route): string {
	switch (route.kind) {
		case ROUTE_KIND.home:
			return ROUTE_PATH.home;
		case ROUTE_KIND.settings:
			return ROUTE_PATH.settings;
		case ROUTE_KIND.session:
			return SESSION_PATH_PREFIX + route.id;
	}
}

/**
 * The route a path names, or `null` for a path the router does not know — the
 * caller lands on home (spec 010 §Routes).
 *
 * Everything after `/session/` is the id, so an id containing a separator still
 * round-trips and no percent-decoder can throw on a malformed path: a session id
 * is an opaque server token, and re-encoding it would only add a failure mode.
 */
export function pathToRoute(path: string): Route | null {
	const normalized = normalizePath(path);
	if (normalized === ROUTE_PATH.home) return homeRoute();
	if (normalized === ROUTE_PATH.settings) return settingsRoute();
	if (!normalized.startsWith(SESSION_PATH_PREFIX)) return null;
	const id = normalized.slice(SESSION_PATH_PREFIX.length);
	return id === "" ? null : sessionRoute(id);
}

/** The path the history currently holds. */
export function currentPath(): string {
	return window.location.pathname;
}

let cachedPath: string | null = null;
let cachedRoute: Route = homeRoute();

/**
 * The current route, with a stable identity until the path changes: a fresh
 * object per call would make `useSyncExternalStore` re-render forever.
 */
export function currentRoute(): Route {
	const path = currentPath();
	if (path !== cachedPath) {
		cachedPath = path;
		cachedRoute = pathToRoute(path) ?? homeRoute();
	}
	return cachedRoute;
}

const listeners = new Set<() => void>();
let popstateBound = false;

function notify(): void {
	for (const listener of [...listeners]) listener();
}

/**
 * Subscribe to navigation; returns the unsubscribe. The `popstate` listener is
 * bound once, on the first subscription, so importing this module has no effect.
 */
export function subscribeToRoute(listener: () => void): () => void {
	listeners.add(listener);
	if (!popstateBound) {
		window.addEventListener("popstate", notify);
		popstateBound = true;
	}
	return () => {
		listeners.delete(listener);
	};
}

/** Navigate: push one history entry, then tell the subscribers. */
export function navigate(route: Route): void {
	const path = routeToPath(route);
	if (path === currentPath()) return;
	window.history.pushState(null, "", path);
	notify();
}

/**
 * Land on a route without adding a history entry: the startup restore's own
 * move (M1.5), so Back still leaves the app rather than returning to `/`.
 */
export function replaceRoute(route: Route): void {
	const path = routeToPath(route);
	if (path === currentPath()) return;
	window.history.replaceState(null, "", path);
	notify();
}

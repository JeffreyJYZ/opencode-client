/**
 * Route kinds and paths for the internal router (spec 010 §Routes).
 *
 * A route *kind* is the discriminant of the `Route` union; a *path* is what the
 * browser history carries. Both live here so no component holds a literal.
 */

/** The route kinds the router serves. */
export const ROUTE_KIND = {
	home: "home",
	session: "session",
	settings: "settings",
} as const;

export type RouteKind = (typeof ROUTE_KIND)[keyof typeof ROUTE_KIND];

/** The paths the built-in router owns, as the history API writes them. */
export const ROUTE_PATH = {
	home: "/",
	/** A session path is this path plus a separator plus the server's session id. */
	session: "/session",
	settings: "/settings",
} as const;

/** The session path prefix including its separator: `/session/` plus the id. */
export const SESSION_PATH_PREFIX = `${ROUTE_PATH.session}/`;

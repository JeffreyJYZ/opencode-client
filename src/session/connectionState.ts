/**
 * The connection state vocabulary (spec 050 §Target and auth).
 *
 * Kept apart from the store so the state a surface reads is one small,
 * testable thing: `none` (no target resolved), `unknown` (resolved, not yet
 * probed), `online`, and `offline` carrying **the url it tried**.
 */

export const CONNECTION_STATUS = {
	none: "none",
	unknown: "unknown",
	online: "online",
	offline: "offline",
} as const;

export type ConnectionStatus = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

export type ConnectionState =
	| { readonly status: typeof CONNECTION_STATUS.none }
	| { readonly status: typeof CONNECTION_STATUS.unknown; readonly url: string }
	| { readonly status: typeof CONNECTION_STATUS.online; readonly url: string }
	| {
			readonly status: typeof CONNECTION_STATUS.offline;
			readonly url: string;
			readonly reason: string;
	  };

/** The message a failure is reported with: an Error's, else the value's own string form. */
export function reasonOf(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

/**
 * Whether two states would render identically. `useSyncExternalStore` compares
 * by identity, so an unchanged state must not become a new object.
 */
export function sameState(a: ConnectionState, b: ConnectionState): boolean {
	if (a.status !== b.status) return false;
	if (a.status === CONNECTION_STATUS.none || b.status === CONNECTION_STATUS.none) return true;
	if (a.url !== b.url) return false;
	const reasonA = a.status === CONNECTION_STATUS.offline ? a.reason : null;
	const reasonB = b.status === CONNECTION_STATUS.offline ? b.reason : null;
	return reasonA === reasonB;
}

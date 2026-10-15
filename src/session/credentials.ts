import { AUTH_TOKEN_QUERY, AUTH_USERNAME } from "@/constants/server";
import type { ResolvedTarget } from "@/session/target";

/**
 * The credential half of spec 050 §Target and auth: HTTP basic with the shipped
 * username, and the `?auth_token=<base64 basic>` form the browser path also
 * accepts. Pure, so the encoding and the strip are tested without a browser.
 */

/** `base64("opencode:<password>")` — the credential the shipped client sends. */
export function basicToken(password: string): string {
	return btoa(`${AUTH_USERNAME}:${password}`);
}

/**
 * The password inside a base64 basic token. `undefined` when the token is
 * absent, undecodable, or has no separator; the split is at the **first** colon,
 * so a password containing one survives.
 */
export function passwordFromAuthToken(token: string | null | undefined): string | undefined {
	if (token === null || token === undefined || token === "") return undefined;
	let decoded: string;
	try {
		decoded = atob(token);
	} catch {
		return undefined;
	}
	const separator = decoded.indexOf(":");
	return separator === -1 ? undefined : decoded.slice(separator + 1);
}

/** The `Authorization` header for a target — absent when the target carries no password. */
export function authorizationHeader(target: ResolvedTarget): string | undefined {
	const password = target.password;
	if (password === undefined || password === "") return undefined;
	return `Basic ${basicToken(password)}`;
}

/** `?auth_token=` read and removed from a search string, so it can leave the address bar. */
export type ConsumedAuthToken = {
	readonly password: string | undefined;
	readonly search: string;
};

/**
 * Read `auth_token` and return the search string without it. Pure: the caller
 * writes the stripped search back to the address bar (spec 050: a token must
 * never sit in the address bar or in history).
 */
export function consumeAuthToken(search: string): ConsumedAuthToken {
	const params = new URLSearchParams(search);
	const token = params.get(AUTH_TOKEN_QUERY);
	if (token === null) return { password: undefined, search };
	params.delete(AUTH_TOKEN_QUERY);
	const remaining = params.toString();
	return {
		password: passwordFromAuthToken(token),
		search: remaining === "" ? "" : `?${remaining}`,
	};
}

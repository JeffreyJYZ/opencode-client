/**
 * The `settings.server` cell: the connect flow's stored target (spec 050 §Target
 * and auth, spec 010 §Persistence). Reading is defensive — the blob is
 * user-writable state on disk — so a wrong shape degrades to "no stored target"
 * rather than refusing the whole blob.
 */

/** A stored server target: the url to reach, and the password to reach it with. */
export type ServerTarget = {
	readonly url: string;
	readonly password: string;
};

/** `null` when nothing usable is stored: not a record, or a blank url. */
export function normalizeServer(raw: unknown): ServerTarget | null {
	if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
	const { url, password } = raw as { readonly url?: unknown; readonly password?: unknown };
	if (typeof url !== "string" || url.trim() === "") return null;
	return { url: url.trim(), password: typeof password === "string" ? password : "" };
}

import { useCallback, useEffect, useRef, useState } from "react";
import { SESSION_PAGE_LIMIT, SESSION_STATUS, type SessionStatus } from "@/constants/sessions";
import type { OpenCodeClient } from "@/session/client";
import type { SessionRow } from "@/session/useSessions";

/**
 * The picker's data path (spec 050 §Sessions; `docs/opencode-api.md` §4): root
 * sessions, newest first, and **the cursor followed** rather than a bigger fixed
 * window, so the picker reaches *any* recent session instead of a longer guess.
 * `pageSize` is injectable and defaults to `SESSION_PAGE_LIMIT`, so a test proves
 * "the second page loads" with three rows across two pages, not 60 seeded ones.
 */

export type SessionPages = {
	readonly rows: readonly SessionRow[];
	readonly status: SessionStatus;
	/** The last page was full **and** carried a cursor: another page exists. */
	readonly hasMore: boolean;
	readonly loadingMore: boolean;
	/** The last `loadMore` failed; the cursor is kept so it can be retried. */
	readonly loadError: boolean;
	readonly loadMore: () => void;
	/** Refetch page one and reset the cursor — e.g. when the picker reopens. */
	readonly reload: () => void;
};

/** The `SessionsResponse` envelope: rows plus the page cursor. */
type Page = {
	readonly data?: SessionRow[];
	readonly cursor?: { readonly next?: string | null } | null;
};

/** Root rows only — a child session (a subagent's) never reaches the picker. */
function roots(page: Page): SessionRow[] {
	return (page.data ?? []).filter((row) => row.parentID == null);
}

/**
 * One page. The generated input nests every field behind `limit` (a codegen
 * artifact), so the flat query is cast at this one seam and commented here;
 * the server accepts the flat shape at runtime.
 */
async function listPage(target: OpenCodeClient, query: Record<string, unknown>): Promise<Page> {
	return (await target.session.list(query as never)) as Page;
}

/** Append `next` after `prev`, dropping any id already present. */
function merge(prev: readonly SessionRow[], next: readonly SessionRow[]): SessionRow[] {
	const seen = new Set(prev.map((row) => row.id));
	const fresh = next.filter((row) => !seen.has(row.id));
	return fresh.length === 0 ? [...prev] : [...prev, ...fresh];
}

/**
 * The end-of-list rule (`docs/opencode-api.md` §4): a cursor is an anchor, not a
 * "has more" flag, so a full **raw** page *and* a cursor is the only honest
 * signal. The count is the server's, taken **before** the root-only `roots()`
 * filter, which may shrink a full page below `pageSize`.
 */
function hasNextPage(page: Page, pageSize: number): boolean {
	return (page.data?.length ?? 0) === pageSize && Boolean(page.cursor?.next);
}

export function useSessionPages(
	client: OpenCodeClient | null,
	pageSize: number = SESSION_PAGE_LIMIT,
): SessionPages {
	const [rows, setRows] = useState<readonly SessionRow[]>([]);
	const [status, setStatus] = useState<SessionStatus>(
		client === null ? SESSION_STATUS.none : SESSION_STATUS.loading,
	);
	const [cursor, setCursor] = useState<string | null>(null);
	const [hasMore, setHasMore] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [loadError, setLoadError] = useState(false);
	const [tick, setTick] = useState(0);
	const inFlight = useRef(false);

	const reload = useCallback(() => setTick((value) => value + 1), []);

	// The first page: one query, no cursor. Re-runs when the client, the injected
	// page size, or `reload` changes, and resets the cursor with it.
	useEffect(() => {
		void tick;
		inFlight.current = false;
		setCursor(null);
		setHasMore(false);
		setLoadError(false);
		if (client === null) {
			setRows([]);
			setStatus(SESSION_STATUS.none);
			return;
		}
		let cancelled = false;
		setStatus(SESSION_STATUS.loading);
		const run = async (target: OpenCodeClient) => {
			try {
				const page = await listPage(target, {
					parentID: null,
					order: "desc",
					limit: pageSize,
				});
				if (cancelled) return;
				const first = roots(page);
				setRows(first);
				setCursor(page.cursor?.next ?? null);
				setHasMore(hasNextPage(page, pageSize));
				setStatus(first.length === 0 ? SESSION_STATUS.empty : SESSION_STATUS.ready);
			} catch {
				if (cancelled) return;
				setRows([]);
				setStatus(SESSION_STATUS.error);
			}
		};
		void run(client);
		return () => {
			cancelled = true;
		};
	}, [client, pageSize, tick]);

	const loadMore = useCallback(() => {
		if (client === null || cursor === null || inFlight.current) return;
		inFlight.current = true;
		setLoadingMore(true);
		setLoadError(false);
		const requested = cursor;
		void (async () => {
			try {
				const page = await listPage(client, {
					parentID: null,
					order: "desc",
					limit: pageSize,
					cursor: requested,
				});
				setRows((prev) => merge(prev, roots(page)));
				setCursor(page.cursor?.next ?? null);
				setHasMore(hasNextPage(page, pageSize));
			} catch {
				setLoadError(true);
			} finally {
				inFlight.current = false;
				setLoadingMore(false);
			}
		})();
	}, [client, cursor, pageSize]);

	return { rows, status, hasMore, loadingMore, loadError, loadMore, reload };
}

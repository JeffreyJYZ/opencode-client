import { useCallback, useEffect, useState } from "react";
import { SESSION_PAGE_LIMIT, SESSION_STATUS, type SessionStatus } from "@/constants/sessions";
import { useClient } from "@/session/ClientProvider";
import type { OpenCodeClient } from "@/session/client";

/** Row type of a session list, derived from the client rather than re-imported. */
export type SessionRow = Awaited<ReturnType<OpenCodeClient["session"]["list"]>>["data"][number];

/**
 * The app's first session list (M1.2 owns it). Root sessions only, newest first,
 * behind `session.list({ parentID: null, order: "desc", limit })`. The server's
 * own default page holds few roots, so the limit is named and non-default.
 *
 * `status` keeps the no-target and failed cases honest: neither reads as "you
 * have no sessions". Refetch is explicit (`reload`); the event-driven refresh is
 * M2.1's seam and is intentionally not polled here.
 */

export type UseSessionsResult = {
	readonly sessions: readonly SessionRow[];
	readonly status: SessionStatus;
	readonly reload: () => void;
};

export function useSessions(): UseSessionsResult {
	const client = useClient();
	const [sessions, setSessions] = useState<readonly SessionRow[]>([]);
	const [status, setStatus] = useState<SessionStatus>(
		client === null ? SESSION_STATUS.none : SESSION_STATUS.loading,
	);
	const [tick, setTick] = useState(0);

	const reload = useCallback(() => {
		setTick((value) => value + 1);
	}, []);

	useEffect(() => {
		void tick;
		if (client === null) {
			setSessions([]);
			setStatus(SESSION_STATUS.none);
			return;
		}
		let cancelled = false;
		setStatus(SESSION_STATUS.loading);
		const run = async (target: OpenCodeClient) => {
			try {
				// The generated input nests every field behind `limit` (codegen
				// artifact); the flat query is what the server accepts at runtime.
				const input = {
					parentID: null,
					order: "desc",
					limit: SESSION_PAGE_LIMIT,
				} as unknown;
				const result = await target.session.list(input as never);
				if (cancelled) return;
				const rows = result?.data ?? [];
				setSessions(rows);
				setStatus(rows.length === 0 ? SESSION_STATUS.empty : SESSION_STATUS.ready);
			} catch {
				if (cancelled) return;
				setSessions([]);
				setStatus(SESSION_STATUS.error);
			}
		};
		void run(client);
		return () => {
			cancelled = true;
		};
	}, [client, tick]);

	return { sessions, status, reload };
}

import type { SessionRow } from "@/session/useSessions";

/**
 * A child session is **running** until the server gives it an `outcome`
 * (`succeeded` | `failed` | `interrupted`) — the absence of one is the signal, and
 * the Subagents panel's own comment says so (M2.19). It is the guard the interrupt
 * affordance reads: only a running child can be interrupted, so a finished row
 * offers none. Named here rather than written as a literal at each use, so the
 * sidebar panel and any later child-session row read the same predicate.
 */
export function isSubagentRunning(row: SessionRow): boolean {
	return row.outcome == null;
}

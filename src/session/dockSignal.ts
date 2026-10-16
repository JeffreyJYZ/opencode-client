import type { V2Event } from "@opencode/client";
import { sessionIDOf } from "@/session/eventEnvelope";

/**
 * The docks' refetch signal (M2.5/M2.6; `M2.1`'s board entry).
 *
 * M2.1 deliberately left `session.permissions`, `permission.*` and `form.*`
 * **unheld**: the transcript store has no row for them, so a permission or form
 * frame reduces to nothing and nothing notifies. The docks are the rows that own
 * their refetch, so they need one honest piece of state the ingest can give them:
 * **a revision counter per session that ticks when a dock frame arrives**. The dock
 * subscribes and re-reads `permission.list` / `session.form.list` — the list is the
 * authority, the frame only the cue. Nothing here holds a request, so a dropped frame
 * costs a delay, not a lost dock: the dock also refetches on mount, on a session
 * switch and on a live transition.
 *
 * **A dock frame does not always name its session the same way** (measured, isolated
 * 2.0.29, `src/test/fixtures/m25-docks-frames.jsonl`): `permission.asked` spreads
 * `Permission.Request.fields`, so its session is `data.sessionID`, while
 * `form.created` nests the whole form, so its session is `data.form.sessionID` —
 * `sessionIDOf` sees `undefined` for the second and the frame is refused before the
 * store even looks at it. `dockSessionIDOf` is the one reader that knows both.
 */

/** The event families the docks care about (`docs/opencode-api.md` §2's table). */
const DOCK_FRAME_PREFIXES = ["permission.", "form."] as const;

export function isDockFrame(event: V2Event): boolean {
	return DOCK_FRAME_PREFIXES.some((prefix) => event.type.startsWith(prefix));
}

/** The `form.created` shape: the frame's own form, whose `sessionID` is nested. */
function nestedFormSessionID(event: V2Event): string | undefined {
	if (event.type !== "form.created") return undefined;
	const form = (event as unknown as { data?: { form?: { sessionID?: unknown } } }).data?.form;
	return typeof form?.sessionID === "string" ? form.sessionID : undefined;
}

/** The session a dock frame belongs to, from either shape, or `undefined`. */
export function dockSessionIDOf(event: V2Event): string | undefined {
	return sessionIDOf(event) ?? nestedFormSessionID(event);
}

export type DockSignals = {
	/** Called by the ingest for a dock frame of a session the app holds. */
	ingest: (sessionID: string) => void;
	/** The session's revision; rises once per dock frame it has seen. */
	revision: (sessionID: string) => number;
	subscribe: (listener: () => void) => () => void;
};

export function createDockSignals(): DockSignals {
	const revisions = new Map<string, number>();
	const listeners = new Set<() => void>();

	function ingest(sessionID: string): void {
		revisions.set(sessionID, (revisions.get(sessionID) ?? 0) + 1);
		for (const listener of [...listeners]) listener();
	}

	return {
		ingest,
		revision: (sessionID) => revisions.get(sessionID) ?? 0,
		subscribe(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
}

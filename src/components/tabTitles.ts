import { useMemo } from "react";
import { useSessions } from "@/session/useSessions";

/**
 * The strip's titles (M2.27): the sessions list the app already holds (M1.2),
 * reduced to id → title. One read for the whole strip, never one per tab.
 *
 * Only sessions with a non-blank title are held: an untitled session keeps its
 * id in the strip — the sidebar may say Untitled, the strip invents no second
 * label for the same state.
 */
export function useTabTitles(): ReadonlyMap<string, string> {
	const { sessions } = useSessions();
	return useMemo(() => {
		const held = new Map<string, string>();
		for (const session of sessions) {
			const title = session.title?.trim();
			if (title !== undefined && title !== "") held.set(session.id, title);
		}
		return held;
	}, [sessions]);
}

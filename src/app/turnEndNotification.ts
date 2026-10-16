import { useEffect, useRef } from "react";
import { useActiveSessionId } from "@/app/useActiveSession";
import { notifyTurnEnd } from "@/native/notify";
import { useTranscript } from "@/session/useTranscript";

/**
 * The unfocused turn-end notification (M5.2).
 *
 * **Two conditions, both necessary**: the turn really ended, and the window is not
 * focused. The store is the source of truth for the first — `transcript.running` is
 * M2.1's own flag, set only by `session.execution.*`, so a turn that merely looks
 * finished to the page cannot notify — and `document.hasFocus()` answers the second
 * at the moment the change lands, not at mount.
 *
 * The watched session is the **open one** (the route's, which is the tab the user is
 * looking at). The shell asks for permission once and stays inert if it is refused;
 * the web build has no shell and is inert too.
 */

/** Whether this change is a notification: a turn ended while the window was unfocused. */
export function shouldNotifyTurnEnd(input: {
	readonly wasRunning: boolean;
	readonly running: boolean;
	readonly focused: boolean;
}): boolean {
	return input.wasRunning && !input.running && !input.focused;
}

export function useTurnEndNotification(): void {
	const sessionID = useActiveSessionId();
	// The store answers `undefined` for a session it does not hold, so an empty id
	// is the honest "no session" rather than a conditional hook.
	const transcript = useTranscript(sessionID ?? "");
	const running = transcript?.running === true;
	const previous = useRef<{ sessionID: string | null; running: boolean }>({
		sessionID,
		running: false,
	});
	useEffect(() => {
		const wasRunning = previous.current.sessionID === sessionID && previous.current.running;
		if (shouldNotifyTurnEnd({ wasRunning, running, focused: document.hasFocus() })) {
			void notifyTurnEnd();
		}
		previous.current = { sessionID, running };
	}, [sessionID, running]);
}

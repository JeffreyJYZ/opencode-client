import { useCallback, useRef, useState } from "react";
import { COMPOSER_INTERRUPT_FAILED, COMPOSER_SEND_FAILED } from "@/constants/composer";
import { interruptSession, runServerCommand, sendPrompt } from "@/session/actions";
import { useClient } from "@/session/ClientProvider";
import type { ComposerMention, PromptRequest } from "@/session/promptTypes";

/**
 * The composer's two writes (M2.5): send, and interrupt.
 *
 * Both go through the seam in `actions.ts`; this hook owns only the **visible**
 * state around them — "sending", and the named failure spec 010 §Never a silent
 * failure requires. It never decides whether a turn is running: the caller passes
 * the store's own flag in, and the interrupt affordance does not exist when it is
 * false (requirement 2).
 */

export type ComposerSend = {
	readonly sending: boolean;
	readonly error: string | null;
	readonly clearError: () => void;
	/** Send one prompt; resolves `true` when the server accepted it. */
	readonly send: (input: {
		readonly sessionID: string;
		readonly text: string;
		readonly mentions: readonly ComposerMention[];
		readonly attachments: PromptRequest["attachments"];
	}) => Promise<boolean>;
	readonly interrupt: (sessionID: string) => Promise<boolean>;
	/** Run a server command instead of prompting: `/name` reaches the server as one. */
	readonly runCommand: (input: {
		readonly sessionID: string;
		readonly name: string;
		readonly text: string;
	}) => Promise<boolean>;
};

export function useComposerSend(): ComposerSend {
	const client = useClient();
	const [sending, setSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// One send at a time: a second ⌘↩ while a prompt is in flight would be a second
	// inbox entry for one intention.
	const inFlight = useRef(false);

	const send = useCallback<ComposerSend["send"]>(
		async (input) => {
			if (client === null || inFlight.current) return false;
			inFlight.current = true;
			setSending(true);
			setError(null);
			try {
				await sendPrompt(client, {
					sessionID: input.sessionID,
					text: input.text,
					mentions: input.mentions,
					attachments: input.attachments,
				});
				return true;
			} catch {
				setError(COMPOSER_SEND_FAILED);
				return false;
			} finally {
				inFlight.current = false;
				setSending(false);
			}
		},
		[client],
	);

	const interrupt = useCallback(
		async (sessionID: string) => {
			if (client === null) return false;
			try {
				await interruptSession(client, sessionID);
				return true;
			} catch {
				setError(COMPOSER_INTERRUPT_FAILED);
				return false;
			}
		},
		[client],
	);

	const runCommand = useCallback<ComposerSend["runCommand"]>(
		async (input) => {
			if (client === null || inFlight.current) return false;
			inFlight.current = true;
			setSending(true);
			setError(null);
			try {
				await runServerCommand(client, input);
				return true;
			} catch {
				setError(COMPOSER_SEND_FAILED);
				return false;
			} finally {
				inFlight.current = false;
				setSending(false);
			}
		},
		[client],
	);

	const clearError = useCallback(() => setError(null), []);

	return { sending, error, clearError, send, interrupt, runCommand };
}

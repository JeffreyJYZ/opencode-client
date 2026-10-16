import type { DragEvent as ReactDragEvent, RefObject } from "react";
import { useCallback, useRef, useState } from "react";
import { clientCommand } from "@/app/clientCommands";
import { attachmentsFromDrop } from "@/components/composer/dropAttachments";
import { useComposerCommandSignal } from "@/components/composer/useComposerCommandSignal";
import { COMPOSER_ATTACH_UNSUPPORTED } from "@/constants/composer";
import type { ComposerEntry } from "@/session/composerEntries";
import { entryEffect, type MenuToken } from "@/session/composerMenuModel";
import {
	mentionsStillValid,
	serverCommandInvocation,
	unsendableAttachment,
} from "@/session/promptPayload";
import type { Attachment, ComposerMention } from "@/session/promptTypes";
import { useComposerSend } from "@/session/useComposerSend";

/**
 * The composer's **edits** (M2.5): the text, the caret, the attachments and the
 * mention spans, plus the three things that change them — accepting a menu row,
 * dropping files, and sending.
 *
 * The menu's own state (which row is highlighted, whether it is open) is
 * `useComposerMenu`; the data is `useComposerData`. Splitting them keeps each piece
 * small enough to read, and keeps this one about the box's contents only.
 *
 * `applyEntry` delegates to the pure `entryEffect`, so the two meanings of accepting
 * a row — a server command inserts `/<name> ` and sends nothing, a client command
 * runs here and inserts nothing — are decided in one testable function.
 */

export type ComposerEdits = {
	readonly text: string;
	readonly setText: (text: string) => void;
	readonly caret: number;
	readonly setCaret: (caret: number) => void;
	readonly onCaret: () => void;
	readonly areaRef: React.RefObject<HTMLTextAreaElement | null>;
	readonly attachments: readonly Attachment[];
	readonly onDrop: (event: ReactDragEvent<HTMLElement>) => void;
	readonly onRemoveAttachment: (uri: string) => void;
	readonly error: string | null;
	readonly sending: boolean;
	readonly applyEntry: (entry: ComposerEntry, token: MenuToken) => void;
	readonly trySend: () => Promise<void>;
	readonly interrupt: () => Promise<boolean>;
};

/**
 * `serverCommands` is the server's own `command.list()` names — a **ref**, because
 * the list comes from a read that needs this hook's own text and caret. The composer
 * routes a prompt that **is** one of those commands through `session.command` rather
 * than `session.prompt`, so `/review` reaches the server as a command, template and
 * arguments intact (spec 050 §Commands).
 */
export function useComposerEdits(
	sessionID: string,
	serverCommands: RefObject<readonly string[]>,
): ComposerEdits {
	const [text, setText] = useState("");
	const [caret, setCaret] = useState(0);
	const [attachments, setAttachments] = useState<readonly Attachment[]>([]);
	const [mentions, setMentions] = useState<readonly ComposerMention[]>([]);
	const [attachError, setAttachError] = useState<string | null>(null);
	const areaRef = useRef<HTMLTextAreaElement | null>(null);
	const textRef = useRef(text);
	textRef.current = text;
	const {
		send,
		interrupt: sendInterrupt,
		runCommand,
		sending,
		error,
		clearError,
	} = useComposerSend();

	useComposerCommandSignal({ textRef, areaRef, setText, setCaret });

	const applyEntry = useCallback((entry: ComposerEntry, token: MenuToken) => {
		const effect = entryEffect(textRef.current, token, entry);
		setText(effect.text);
		setCaret(effect.caret);
		if (effect.mention !== null) {
			const mention = effect.mention;
			setMentions((current) => [...current, mention]);
		}
		if (effect.runClientCommand !== null) clientCommand(effect.runClientCommand)?.run();
		areaRef.current?.focus();
	}, []);

	const trySend = useCallback(async () => {
		const body = textRef.current.trim();
		const unsendable = unsendableAttachment(attachments);
		if (unsendable !== null) {
			setAttachError(COMPOSER_ATTACH_UNSUPPORTED);
			return;
		}
		if (body === "" && attachments.length === 0) return;
		clearError();
		setAttachError(null);
		const invocation = serverCommandInvocation(body, serverCommands.current ?? []);
		const accepted =
			invocation === null
				? await send({
						sessionID,
						text: body,
						mentions: mentionsStillValid(textRef.current, mentions),
						attachments,
					})
				: await runCommand({ sessionID, name: invocation.name, text: invocation.text });
		if (!accepted) return;
		setText("");
		setCaret(0);
		setMentions([]);
		setAttachments([]);
	}, [attachments, clearError, mentions, runCommand, send, serverCommands, sessionID]);

	const onDrop = useCallback((event: ReactDragEvent<HTMLElement>) => {
		event.preventDefault();
		const dropped = attachmentsFromDrop(event.dataTransfer);
		if (dropped.length === 0) return;
		setAttachments((current) => [...current, ...dropped]);
		if (unsendableAttachment(dropped) !== null) setAttachError(COMPOSER_ATTACH_UNSUPPORTED);
	}, []);

	return {
		text,
		setText,
		caret,
		setCaret,
		onCaret: () => setCaret(areaRef.current?.selectionStart ?? 0),
		areaRef,
		attachments,
		onDrop,
		onRemoveAttachment: (uri) =>
			setAttachments((current) => current.filter((entry) => entry.uri !== uri)),
		error: attachError ?? error,
		sending,
		applyEntry,
		trySend,
		interrupt: () => sendInterrupt(sessionID),
	};
}

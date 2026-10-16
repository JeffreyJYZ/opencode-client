import type { DragEvent as ReactDragEvent } from "react";
import { useCallback, useState } from "react";
import { attachmentsFromDrop } from "@/components/composer/dropAttachments";
import { COMPOSER_ATTACH_UNSUPPORTED } from "@/constants/composer";
import { unsendableAttachment } from "@/session/promptPayload";
import type { Attachment } from "@/session/promptTypes";

/**
 * The composer's attachments (M2.5, extended by M5.2): the list, and the **one** place
 * that appends to it. A DOM drop reads its `DataTransfer`; the shell hands over the
 * absolute paths of a Finder drop (M5.2) — both end in `attach`, so an unsendable entry
 * is reported the same way and the draft is never touched.
 *
 * Split from `useComposerEdits` so each file is about one thing: this one owns what is
 * attached, that one owns the text and the send.
 */

export type ComposerAttachments = {
	readonly attachments: readonly Attachment[];
	/** The named refusal for an entry with no path, or `null`. */
	readonly unsupported: string | null;
	readonly clearUnsupported: () => void;
	/** Append dropped entries — a DOM drop's, or the shell's (M5.2). */
	readonly attach: (attachments: readonly Attachment[]) => void;
	readonly onDrop: (event: ReactDragEvent<HTMLElement>) => void;
	readonly remove: (uri: string) => void;
	readonly clear: () => void;
	/** Whether the current list holds an unsendable entry; says so when it does. */
	readonly rejectUnsendable: () => boolean;
};

export function useComposerAttachments(): ComposerAttachments {
	const [attachments, setAttachments] = useState<readonly Attachment[]>([]);
	const [unsupported, setUnsupported] = useState<string | null>(null);

	const attach = useCallback((dropped: readonly Attachment[]) => {
		if (dropped.length === 0) return;
		setAttachments((current) => [...current, ...dropped]);
		if (unsendableAttachment(dropped) !== null) setUnsupported(COMPOSER_ATTACH_UNSUPPORTED);
	}, []);

	const onDrop = useCallback(
		(event: ReactDragEvent<HTMLElement>) => {
			event.preventDefault();
			attach(attachmentsFromDrop(event.dataTransfer));
		},
		[attach],
	);

	return {
		attachments,
		unsupported,
		clearUnsupported: useCallback(() => setUnsupported(null), []),
		attach,
		onDrop,
		remove: useCallback(
			(uri: string) =>
				setAttachments((current) => current.filter((entry) => entry.uri !== uri)),
			[],
		),
		clear: useCallback(() => setAttachments([]), []),
		rejectUnsendable: useCallback(() => {
			if (unsendableAttachment(attachments) === null) return false;
			setUnsupported(COMPOSER_ATTACH_UNSUPPORTED);
			return true;
		}, [attachments]),
	};
}

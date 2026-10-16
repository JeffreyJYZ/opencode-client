import { COMPOSER_CONTROL_STYLE, COMPOSER_LINE_STYLE } from "@/components/composer/composerStyles";
import { COMPOSER_ATTACH_REMOVE_LABEL } from "@/constants/composer";
import type { Attachment } from "@/session/promptTypes";

/**
 * The attachment strip (spec 020 §Prompt box: files ride the payload's `files[]` with
 * a `uri`). Each entry shows the name it will be sent as, and can be removed before
 * the prompt leaves; an entry with **no path** is already refused by the box, so it is
 * visible here for exactly as long as it takes the user to notice and remove it.
 */

export type ComposerAttachmentsProps = {
	readonly attachments: readonly Attachment[];
	readonly onRemove: (uri: string) => void;
};

export function ComposerAttachments({ attachments, onRemove }: ComposerAttachmentsProps) {
	if (attachments.length === 0) return null;
	return (
		<div style={COMPOSER_LINE_STYLE}>
			{attachments.map((attachment) => (
				<span key={attachment.uri === "" ? attachment.name : attachment.uri}>
					{attachment.name ?? attachment.uri}
					<button
						type="button"
						style={COMPOSER_CONTROL_STYLE}
						aria-label={COMPOSER_ATTACH_REMOVE_LABEL}
						onClick={() => onRemove(attachment.uri)}
					>
						×
					</button>
				</span>
			))}
		</div>
	);
}

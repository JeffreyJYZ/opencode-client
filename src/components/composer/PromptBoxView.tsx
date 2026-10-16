import type {
	DragEvent as ReactDragEvent,
	KeyboardEvent as ReactKeyboardEvent,
	RefObject,
} from "react";
import { ComposerAttachments } from "@/components/composer/ComposerAttachments";
import {
	ComposerIdentity,
	type ComposerIdentityProps,
} from "@/components/composer/ComposerIdentity";
import { ComposerMenu, menuOptionId } from "@/components/composer/ComposerMenu";
import {
	COMPOSER_BOX_STYLE,
	COMPOSER_CONTROL_STYLE,
	COMPOSER_FRAME_STYLE,
	COMPOSER_INPUT_STYLE,
	COMPOSER_LINE_STYLE,
	COMPOSER_RUNNING_STYLE,
} from "@/components/composer/composerStyles";
import { DOCK_ERROR_STYLE } from "@/components/composer/dockStyles";
import {
	COMPOSER_INTERRUPT_LABEL,
	COMPOSER_LABEL,
	COMPOSER_MENU_LIST_ID,
	COMPOSER_PLACEHOLDER,
	COMPOSER_PROMPT_LABEL,
	COMPOSER_QUEUED_LABEL,
	COMPOSER_QUEUED_NOTE,
	COMPOSER_SEND_LABEL,
} from "@/constants/composer";
import type { ComposerEntry } from "@/session/composerEntries";
import type { Attachment } from "@/session/promptTypes";

/**
 * The prompt box's DOM (spec 020 §Prompt box, M2.5). All state and behaviour live in
 * `PromptBox.tsx`; this file draws what that state says, so the send path and the
 * keyboard rules are readable in one place.
 *
 * Three things it deliberately does **not** do: it never assembles a payload, never
 * decides whether a turn is running (the `running` prop is the store's), and never
 * renders the interrupt affordance while nothing runs — the button does not exist
 * when `running` is false, so pressing it is impossible rather than useless.
 */

export type PromptBoxViewProps = {
	readonly running: boolean;
	readonly sending: boolean;
	readonly error: string | null;
	readonly text: string;
	readonly areaRef: RefObject<HTMLTextAreaElement | null>;
	readonly onText: (text: string, caret: number) => void;
	readonly onCaret: () => void;
	readonly onKeyDown: (event: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
	readonly identity: ComposerIdentityProps;
	readonly entries: readonly ComposerEntry[];
	readonly active: number;
	readonly loadingCommands: boolean;
	readonly menuOpen: boolean;
	readonly onPick: (entry: ComposerEntry) => void;
	readonly onHover: (index: number) => void;
	readonly attachments: readonly Attachment[];
	readonly onRemoveAttachment: (uri: string) => void;
	readonly onDrop: (event: ReactDragEvent<HTMLElement>) => void;
	readonly onSend: () => void;
	readonly onInterrupt: () => void;
};

export function PromptBoxView(props: PromptBoxViewProps) {
	const focused = props.entries[props.active];
	return (
		<section style={COMPOSER_FRAME_STYLE} aria-label={COMPOSER_LABEL}>
			<div style={props.running ? COMPOSER_RUNNING_STYLE : COMPOSER_BOX_STYLE}>
				{props.menuOpen ? (
					<ComposerMenu
						entries={props.entries}
						active={props.active}
						loading={props.loadingCommands}
						onPick={props.onPick}
						onHover={props.onHover}
					/>
				) : null}
				<textarea
					ref={props.areaRef}
					role="combobox"
					aria-autocomplete="list"
					aria-label={COMPOSER_PROMPT_LABEL}
					aria-expanded={props.menuOpen}
					aria-controls={props.menuOpen ? COMPOSER_MENU_LIST_ID : undefined}
					aria-activedescendant={
						props.menuOpen && focused !== undefined
							? menuOptionId(focused.id)
							: undefined
					}
					placeholder={COMPOSER_PLACEHOLDER}
					style={COMPOSER_INPUT_STYLE}
					value={props.text}
					// A change carries the new caret: the token before it is what the menu
					// answers to, so both arrive from one event.
					onChange={(event) =>
						props.onText(
							event.target.value,
							event.target.selectionStart ?? event.target.value.length,
						)
					}
					onSelect={props.onCaret}
					onKeyDown={props.onKeyDown}
					// The field is the box's drop target: a dropped file lands where the
					// prompt is being typed, and `attachmentsFromDrop` reads its path.
					onDrop={props.onDrop}
					onDragOver={(event) => event.preventDefault()}
				/>
				<ComposerAttachments
					attachments={props.attachments}
					onRemove={props.onRemoveAttachment}
				/>
				{props.error === null ? null : <p style={DOCK_ERROR_STYLE}>{props.error}</p>}
				<div style={COMPOSER_LINE_STYLE}>
					<ComposerIdentity {...props.identity} />
					<span>
						{props.running ? (
							<button
								type="button"
								style={COMPOSER_CONTROL_STYLE}
								onClick={props.onInterrupt}
							>
								{COMPOSER_INTERRUPT_LABEL}
							</button>
						) : (
							<button
								type="button"
								style={COMPOSER_CONTROL_STYLE}
								disabled={props.sending}
								onClick={props.onSend}
							>
								{COMPOSER_SEND_LABEL}
							</button>
						)}
						{props.running ? (
							<span title={COMPOSER_QUEUED_NOTE} style={COMPOSER_LINE_STYLE}>
								{COMPOSER_QUEUED_LABEL}
							</span>
						) : null}
					</span>
				</div>
			</div>
		</section>
	);
}

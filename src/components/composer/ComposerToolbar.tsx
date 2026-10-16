import {
	ComposerIdentity,
	type ComposerIdentityProps,
} from "@/components/composer/ComposerIdentity";
import {
	COMPOSER_CONTROL_STYLE,
	COMPOSER_LINE_STYLE,
	COMPOSER_SEND_GROUP_STYLE,
} from "@/components/composer/composerStyles";
import { Slot } from "@/components/Slot";
import {
	COMPOSER_INTERRUPT_LABEL,
	COMPOSER_QUEUED_LABEL,
	COMPOSER_QUEUED_NOTE,
	COMPOSER_SEND_LABEL,
} from "@/constants/composer";
import { SLOT } from "@/constants/slots";

/**
 * The composer's own toolbar line (M4.12): the identity controls, the send or
 * interrupt affordance, and the `composer.toolbar` host. It was `PromptBoxView`'s
 * own line until the three composer slots pushed that file to the 150-line cap;
 * the seam is the line itself, and the DOM it draws is unchanged.
 *
 * **Interrupt and "Queued" read different facts** (M2.26): the button is about the
 * turn (`running`), the label about the queue (`queued`, the transcript's own
 * `DELIVERY.queued`). A running turn with an empty queue is interruptible and not
 * queued, so it shows the button and no label.
 *
 * **Send sits at the row's end** (M2.30): the affordance group carries
 * `marginLeft: auto`, so it shares the identity row when it fits and wraps
 * below right-aligned when the long `providerID/id` option takes the row.
 */
export type ComposerToolbarProps = {
	readonly identity: ComposerIdentityProps;
	readonly running: boolean;
	/** A prompt is actually queued in this session (never a synonym for `running`). */
	readonly queued: boolean;
	readonly sending: boolean;
	readonly onSend: () => void;
	readonly onInterrupt: () => void;
};

export function ComposerToolbar(props: ComposerToolbarProps) {
	return (
		<div style={COMPOSER_LINE_STYLE}>
			<ComposerIdentity {...props.identity} />
			<span style={COMPOSER_SEND_GROUP_STYLE}>
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
				{props.queued ? (
					<span title={COMPOSER_QUEUED_NOTE}>{COMPOSER_QUEUED_LABEL}</span>
				) : null}
			</span>
			<Slot id={SLOT.composerToolbar} />
		</div>
	);
}

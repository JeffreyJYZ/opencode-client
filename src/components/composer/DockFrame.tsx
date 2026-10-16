import type { KeyboardEvent as ReactKeyboardEvent, ReactNode, RefObject } from "react";
import { COMPOSER_FRAME_STYLE, COMPOSER_LINE_STYLE } from "@/components/composer/composerStyles";
import { DOCK_ERROR_STYLE, DOCK_FRAME_STYLE } from "@/components/composer/dockStyles";
import type { COMPOSER_DOCK_KEYS } from "@/constants/composer";

/**
 * A dock's frame (spec 020 §Docks: "no dialog, no overlay — raised surface, accent
 * left rail, the reference's inner padding, and a footer line naming the keys").
 *
 * The docks **replace the composer** rather than floating over it, which is what
 * makes requirement 6 structural: while a dock is open the prompt box does not
 * exist, so no prompt can be silently accepted and refused.
 *
 * The frame owns the keys, because a keyboard-first dock must answer them from
 * anywhere inside it, and the `<fieldset>` is the container that can hold a key
 * handler without claiming a dialog's modality.
 */

const FIELD_STYLE = { border: "none", margin: 0, padding: 0, display: "contents" } as const;

export type DockFrameProps = {
	readonly label: string;
	readonly keys: (typeof COMPOSER_DOCK_KEYS)[keyof typeof COMPOSER_DOCK_KEYS];
	readonly error: string | null;
	/** The dock's own keys, answered wherever focus sits inside it. */
	readonly onKeyDown: (event: ReactKeyboardEvent<HTMLFieldSetElement>) => void;
	/** The container, so the dock can focus its first control when it opens. */
	readonly focusRef: RefObject<HTMLFieldSetElement | null>;
	readonly children: ReactNode;
};

export function DockFrame({ label, keys, error, onKeyDown, focusRef, children }: DockFrameProps) {
	return (
		<section aria-label={label} style={COMPOSER_FRAME_STYLE}>
			<fieldset ref={focusRef} onKeyDown={onKeyDown} style={FIELD_STYLE}>
				<div style={DOCK_FRAME_STYLE}>
					{children}
					{error === null ? null : <p style={DOCK_ERROR_STYLE}>{error}</p>}
					<footer style={COMPOSER_LINE_STYLE}>{keys}</footer>
				</div>
			</fieldset>
		</section>
	);
}

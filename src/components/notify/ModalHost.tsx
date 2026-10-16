import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { useFocusTrap } from "@/components/useFocusTrap";
import { useMenuDismiss } from "@/components/useMenuDismiss";
import {
	NOTIFY_ACCEPT_LABEL,
	NOTIFY_CANCEL_LABEL,
	NOTIFY_CONFIRM_DIALOG_LABEL,
	NOTIFY_DISMISS_LABEL,
	NOTIFY_MODAL_ROLE,
	NOTIFY_NOTICE_DIALOG_LABEL,
} from "@/constants/notify";
import { getModals, MODAL_KIND, resolveModal, subscribeModals } from "./modalStore";
import {
	MODAL_ACTION_STYLE,
	MODAL_ACTIONS_STYLE,
	MODAL_DIALOG_STYLE,
	MODAL_MESSAGE_STYLE,
	MODAL_OVERLAY_STYLE,
} from "./modalStyles";

/**
 * The modal host (M4.20): the one place a plugin's notice or question is drawn,
 * mounted by the shell beside `ToastHost`. It renders the **front of the queue**,
 * so a modal is modal — one at a time — and answering it reveals the next.
 *
 * It copies the app's existing dialog pattern rather than inventing one: the same
 * window-level focus trap (`useFocusTrap`) and the same Escape-and-outside-click
 * dismissal (`useMenuDismiss`). Escape and a click on the scrim are the user
 * refusing, so a confirm resolves `false` — their answer, not a default.
 */
export function ModalHost() {
	const requests = useSyncExternalStore(subscribeModals, getModals);
	const head = requests[0];
	const dialogRef = useRef<HTMLDivElement | null>(null);
	const primaryRef = useRef<HTMLButtonElement | null>(null);
	const open = head !== undefined;

	useFocusTrap(dialogRef, open);

	// Escape and a scrim click dismiss the head; a confirm reads that as `false`.
	const refuse = useCallback(() => {
		const current = getModals()[0];
		if (current !== undefined) resolveModal(current.id, false);
	}, []);
	useMenuDismiss(open, refuse, dialogRef);

	// Focus the primary affordance when a request opens, or the queue advances.
	const headId = head?.id;
	useEffect(() => {
		if (headId !== undefined) primaryRef.current?.focus();
	}, [headId]);

	if (head === undefined) return null;
	const confirming = head.kind === MODAL_KIND.confirm;
	return (
		<div style={MODAL_OVERLAY_STYLE}>
			{/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: the role is the named
			    constant NOTIFY_MODAL_ROLE; Biome cannot resolve a variable role and reads
			    this as a bare div, where `aria-modal` is unsupported. */}
			<div
				ref={dialogRef}
				role={NOTIFY_MODAL_ROLE}
				aria-modal="true"
				aria-label={confirming ? NOTIFY_CONFIRM_DIALOG_LABEL : NOTIFY_NOTICE_DIALOG_LABEL}
				style={MODAL_DIALOG_STYLE}
			>
				<p style={MODAL_MESSAGE_STYLE}>{head.message}</p>
				<div style={MODAL_ACTIONS_STYLE}>
					{confirming && (
						<button
							ref={primaryRef}
							type="button"
							style={MODAL_ACTION_STYLE}
							onClick={() => resolveModal(head.id, true)}
						>
							{NOTIFY_ACCEPT_LABEL}
						</button>
					)}
					<button
						ref={confirming ? undefined : primaryRef}
						type="button"
						style={MODAL_ACTION_STYLE}
						onClick={() => resolveModal(head.id, false)}
					>
						{confirming ? NOTIFY_CANCEL_LABEL : NOTIFY_DISMISS_LABEL}
					</button>
				</div>
			</div>
		</div>
	);
}

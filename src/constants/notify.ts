/**
 * The app's notice sinks (M4.20): the words and ARIA roles a plugin's
 * `notify.banner`/`notify.modal`/`notify.confirm` draw. The toast's own constants
 * live beside the rest of the native seam in `native.ts`; these are the two sinks
 * a toast cannot stand in for — a banner that persists and a modal dialog whose
 * `confirm` resolves the user's answer.
 *
 * No component holds a literal: the roles, the two dialog names, the three
 * affordances and the banner region's name are all named here.
 */

/** The banner's ARIA role: a persistent region, announced, never an interrupting alert. */
export const NOTIFY_BANNER_ROLE = "status";

/** The banner region's own name, and its dismiss affordance. */
export const NOTIFY_BANNER_REGION_LABEL = "Notices";
export const NOTIFY_BANNER_DISMISS_LABEL = "Dismiss notice";

/** The modal's ARIA role: a notice or a question interrupts, so `alertdialog`. */
export const NOTIFY_MODAL_ROLE = "alertdialog";

/** A dialog's accessible name, by kind: a notice and a question must not read alike. */
export const NOTIFY_NOTICE_DIALOG_LABEL = "Notice";
export const NOTIFY_CONFIRM_DIALOG_LABEL = "Confirmation";

/** The modal's affordances: the answer, a refusal, and a plain dismissal. */
export const NOTIFY_ACCEPT_LABEL = "Confirm";
export const NOTIFY_CANCEL_LABEL = "Cancel";
export const NOTIFY_DISMISS_LABEL = "Dismiss";

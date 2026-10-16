import { useEffect, useSyncExternalStore } from "react";
import { TOAST_DISMISS_LABEL, TOAST_REGION_LABEL, TOAST_TIMEOUT_MS } from "@/constants/native";
import { dismissToast, getToasts, subscribeToasts, type Toast } from "./toastStore";
import { TOAST_DISMISS_STYLE, TOAST_STACK_STYLE, TOAST_STYLE } from "./toastStyles";

/**
 * The toast host (M5.2): the one place a toast is drawn. It is mounted by the
 * shell, so every module that can say something reaches it through `toastStore` and
 * none of them needs a context.
 *
 * A toast is a **real, dismissible, accessible element**: its `role` is the ARIA
 * role it is announced under (`status` or `alert`), it carries a named dismiss
 * button, and it removes itself after `TOAST_TIMEOUT_MS`. The host renders nothing
 * at all when there is nothing to say.
 */

/** One toast: announced by its role, dismissible, and gone when its time is up. */
function ToastItem({ toast }: { readonly toast: Toast }) {
	useEffect(() => {
		const timer = window.setTimeout(() => dismissToast(toast.id), TOAST_TIMEOUT_MS);
		return () => window.clearTimeout(timer);
	}, [toast.id]);
	return (
		<div role={toast.role} style={TOAST_STYLE}>
			<span>{toast.message}</span>
			<button
				type="button"
				aria-label={TOAST_DISMISS_LABEL}
				style={TOAST_DISMISS_STYLE}
				onClick={() => dismissToast(toast.id)}
			>
				×
			</button>
		</div>
	);
}

export function ToastHost() {
	const toasts = useSyncExternalStore(subscribeToasts, getToasts);
	if (toasts.length === 0) return null;
	return (
		<section aria-label={TOAST_REGION_LABEL} style={TOAST_STACK_STYLE}>
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} />
			))}
		</section>
	);
}

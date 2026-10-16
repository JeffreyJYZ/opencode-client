import { TOAST_ROLE, type ToastRole } from "@/constants/native";

/**
 * The toast store (M5.2): a module-level list, subscribed to with
 * `useSyncExternalStore`, so **any** module can say something to the user without a
 * React context — a copy in a transcript row, a refused link, a failed editor.
 *
 * A toast is `{ id, role, message }` and nothing else: the id is what a dismiss
 * names, the role is the ARIA role it is announced under, and the message is the
 * whole content. Immutable snapshots keep `useSyncExternalStore` honest.
 */

export type Toast = {
	readonly id: number;
	readonly role: ToastRole;
	readonly message: string;
};

const EMPTY: readonly Toast[] = [];

let toasts: readonly Toast[] = EMPTY;
let nextID = 1;
const listeners = new Set<() => void>();

function publish(next: readonly Toast[]): void {
	toasts = next;
	for (const listener of [...listeners]) listener();
}

export function subscribeToasts(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getToasts(): readonly Toast[] {
	return toasts;
}

/** Show a message. Returns the toast's id, which is what dismisses it. */
export function pushToast(message: string, role: ToastRole = TOAST_ROLE.status): number {
	const id = nextID++;
	publish([...toasts, { id, role, message }]);
	return id;
}

export function dismissToast(id: number): void {
	publish(toasts.filter((toast) => toast.id !== id));
}

/** Clear every toast — the tests' reset, and a target change's. */
export function resetToasts(): void {
	if (toasts.length === 0) return;
	publish(EMPTY);
}

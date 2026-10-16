/**
 * The modal store (M4.20): the app's one dialog sink, a module-level queue
 * subscribed to with `useSyncExternalStore`, so a plugin's `notify.modal` and
 * `notify.confirm` reach it without a React context.
 *
 * The difference from a banner is the answer. A `notice` is shown until the user
 * dismisses it; a `confirm` **resolves the answer the user gives** — `true` on the
 * affirmative, `false` on cancel or Escape. Escape is the user's answer, not a
 * default, which is why it resolves rather than being left pending. With no host
 * mounted a pending confirm is never drawn, so `resetModals` resolves it `false`
 * and a plugin can never hang on a dialog nobody drew.
 */

export const MODAL_KIND = {
	notice: "notice",
	confirm: "confirm",
} as const;

export type ModalKind = (typeof MODAL_KIND)[keyof typeof MODAL_KIND];

export type ModalRequest = {
	readonly id: number;
	readonly kind: ModalKind;
	readonly message: string;
};

const EMPTY: readonly ModalRequest[] = [];

let requests: readonly ModalRequest[] = EMPTY;
let nextID = 1;
const listeners = new Set<() => void>();
const resolvers = new Map<number, (answer: boolean) => void>();

function publish(next: readonly ModalRequest[]): void {
	requests = next;
	for (const listener of [...listeners]) listener();
}

export function subscribeModals(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getModals(): readonly ModalRequest[] {
	return requests;
}

/** Show a modal notice: it stays until the user dismisses it. */
export function pushModal(message: string): number {
	const id = nextID++;
	publish([...requests, { id, kind: MODAL_KIND.notice, message }]);
	return id;
}

/** Ask the user a question. Resolves with the answer they give, never a constant. */
export function requestConfirm(message: string): Promise<boolean> {
	const id = nextID++;
	return new Promise<boolean>((resolve) => {
		resolvers.set(id, resolve);
		publish([...requests, { id, kind: MODAL_KIND.confirm, message }]);
	});
}

/** Dismiss one request. A confirm resolves with `answer` — the user's own. */
export function resolveModal(id: number, answer: boolean): void {
	publish(requests.filter((request) => request.id !== id));
	const resolve = resolvers.get(id);
	if (resolve === undefined) return;
	resolvers.delete(id);
	resolve(answer);
}

/** Clear every request — the tests' reset. A pending confirm resolves `false`. */
export function resetModals(): void {
	for (const [id, resolve] of resolvers) {
		resolvers.delete(id);
		resolve(false);
	}
	if (requests.length === 0) return;
	publish(EMPTY);
}

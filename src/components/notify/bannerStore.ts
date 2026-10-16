/**
 * The banner store (M4.20): the app's persistent notice sink, a module-level list
 * subscribed to with `useSyncExternalStore`, so a plugin's `notify.banner` reaches
 * it without a React context — the same shape `toastStore` uses.
 *
 * A banner is `{ id, message }` and **nothing times it out**: unlike a toast, it
 * stays until the user dismisses it, which is the whole reason it is not a toast.
 * Immutable snapshots keep `useSyncExternalStore` honest.
 */

export type Banner = {
	readonly id: number;
	readonly message: string;
};

const EMPTY: readonly Banner[] = [];

let banners: readonly Banner[] = EMPTY;
let nextID = 1;
const listeners = new Set<() => void>();

function publish(next: readonly Banner[]): void {
	banners = next;
	for (const listener of [...listeners]) listener();
}

export function subscribeBanners(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export function getBanners(): readonly Banner[] {
	return banners;
}

/** Show a persistent banner. Returns its id, which is what dismisses it. */
export function pushBanner(message: string): number {
	const id = nextID++;
	publish([...banners, { id, message }]);
	return id;
}

export function dismissBanner(id: number): void {
	publish(banners.filter((banner) => banner.id !== id));
}

/** Clear every banner — the tests' reset, and a target change's. */
export function resetBanners(): void {
	if (banners.length === 0) return;
	publish(EMPTY);
}

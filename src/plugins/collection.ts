import type { Disposable } from "@/plugins/disposable";

/**
 * The one storage a registry is built on (spec 040 §The host): a keyed,
 * order-aware collection with a stable snapshot and an identity-checked
 * disposer. A built-in's contribution and a plugin's are the same kind of row in
 * the same collection, which is what makes their lifetime behaviour identical.
 *
 * **A contribution that names no `order` sorts last**, never first: a
 * contribution belongs after the built-ins registered before it, so a plugin
 * section cannot land above the built-in Typography section (M3.5 measured the
 * old default, which put it there).
 */

/** The order a contribution that names none gets: after every ordered one. */
export const NO_ORDER = Number.POSITIVE_INFINITY;

export type Ordered = { readonly order?: number };

/** The order an entry declares, or `NO_ORDER` when it names none or is not an entry. */
function orderOf(entry: unknown): number {
	if (typeof entry !== "object" || entry === null) return NO_ORDER;
	const order = (entry as { readonly order?: unknown }).order;
	return typeof order === "number" ? order : NO_ORDER;
}

/** Lower first; two equal orders keep registration order, because the sort is stable. */
export function compareByOrder(a: unknown, b: unknown): number {
	const left = orderOf(a);
	const right = orderOf(b);
	if (left < right) return -1;
	if (left > right) return 1;
	return 0;
}

export type Collection<T> = {
	/** Add or replace an entry; the handle removes exactly this one, and nothing else. */
	set(entry: T): Disposable;
	remove(key: string): boolean;
	get(key: string): T | undefined;
	has(key: string): boolean;
	/** What is registered now, in order; the same array until something changes. */
	list(): readonly T[];
	keys(): readonly string[];
	/** Replace everything at once, with one change (a registry's seed or a test's reset). */
	replaceAll(entries: readonly T[]): void;
};

export type CollectionOptions<T> = {
	/** Which field identifies an entry: its `id`, unless a registry keys by something else. */
	readonly keyOf?: (entry: T) => string;
	/** Whether `order` sorts the entries at all. A kind-keyed registry is not ordered. */
	readonly ordered?: boolean;
	/** Told after every change, so the registry keeps its one listener set. */
	readonly onChange?: () => void;
};

export function createCollection<T>(options: CollectionOptions<T> = {}): Collection<T> {
	const keyOf = options.keyOf ?? ((entry: T) => (entry as { readonly id: string }).id);
	const ordered = options.ordered ?? true;
	const entries = new Map<string, T>();
	let snapshot: readonly T[] = [];

	function publish(): void {
		const values = [...entries.values()];
		snapshot = ordered ? values.sort(compareByOrder) : values;
		options.onChange?.();
	}

	function set(entry: T): Disposable {
		const key = keyOf(entry);
		entries.set(key, entry);
		publish();
		return {
			dispose(): void {
				// Exactly this entry: a later registration under the same key is a
				// different one, and disposing the old handle must not take it away.
				if (entries.get(key) !== entry) return;
				entries.delete(key);
				publish();
			},
		};
	}

	return {
		set,
		remove(key: string): boolean {
			if (!entries.delete(key)) return false;
			publish();
			return true;
		},
		get: (key) => entries.get(key),
		has: (key) => entries.has(key),
		list: () => snapshot,
		keys: () => [...entries.keys()],
		replaceAll(next: readonly T[]): void {
			entries.clear();
			for (const entry of next) entries.set(keyOf(entry), entry);
			publish();
		},
	};
}

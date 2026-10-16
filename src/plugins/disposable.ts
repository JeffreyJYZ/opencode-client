/**
 * A handle a synchronous registration returns (spec 040 §The host): disposing it
 * removes exactly that contribution, and nothing else.
 */
export type Disposable = {
	dispose(): void;
};

/**
 * The one inert handle a refused contribution gets, the same object every time.
 * A refusal has nothing to retract, and a fresh closure per refusal would suggest
 * otherwise.
 */
export const REFUSED: Disposable = {
	dispose(): void {
		// A refused contribution was never registered, so there is nothing to remove.
	},
};

/**
 * Whether a value is a handle (spec 040 §Entry file: `setup` returns nothing or a
 * `Disposable`). A plugin's return value crosses the module boundary as `unknown`,
 * so the loader checks the shape rather than trusting it.
 */
export function isDisposable(value: unknown): value is Disposable {
	if (typeof value !== "object" || value === null) return false;
	return typeof (value as { dispose?: unknown }).dispose === "function";
}

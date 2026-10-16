import type { Disposable } from "@/plugins/disposable";
import { FAULT_AREAS, FAULT_REASONS, recordFault } from "@/plugins/faults";

/**
 * One loaded plugin's lifetime (spec 040 §The host): the handle its `setup`
 * returned plus every contribution it registered while setting up.
 *
 * Disposal is the **reverse of the order the handles arrived** — the `setup`
 * handle was kept last, so it runs first, before the registrations are collected
 * (spec 040 §Entry file). A handle that throws is recorded and the rest still run,
 * so one bad `dispose` cannot strand the others.
 */
export type PluginInstance = {
	readonly id: string;
	/** Append a handle; disposal runs newest first. */
	add(disposable: Disposable): void;
	/** Run every handle, newest first; a throwing one is faulted, not fatal. */
	dispose(): void;
};

export function createInstance(id: string): PluginInstance {
	let handles: readonly Disposable[] = [];
	return {
		id,
		add(disposable: Disposable): void {
			handles = [...handles, disposable];
		},
		dispose(): void {
			const closing = handles;
			handles = [];
			for (let index = closing.length - 1; index >= 0; index--) {
				try {
					closing[index].dispose();
				} catch (error) {
					recordFault({
						area: FAULT_AREAS.plugins,
						reason: FAULT_REASONS.disposeThrew,
						subject: id,
						message: `disposing "${id}" threw: ${String(error)}`,
					});
				}
			}
		},
	};
}

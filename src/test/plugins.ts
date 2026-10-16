import { listFaults } from "@/plugins/faults";
import { installHostGlobals } from "@/plugins/globals";
import {
	createLoader,
	type Loader,
	type LoaderOptions,
	type PluginRequest,
} from "@/plugins/loader";

/**
 * Helpers for the M4.1/M4.2 tests: a throwaway plugin that dates its own import,
 * setup and dispose on `globalThis`, and the loader scaffolding around it.
 */

/** The `globalThis` keys a throwaway plugin writes, so a test can read its trace. */
export const TRACE = {
	marker: "__m41Marker",
	order: "__m41Order",
	imported: "__m41Imported",
} as const;

export const globals = globalThis as unknown as Record<string, unknown>;

const HOST = {};
const HOST_GLOBALS = { host: HOST, react: {}, jsx: {} };

export function installGlobals(): void {
	installHostGlobals(HOST_GLOBALS);
}

export function clearTrace(): void {
	for (const key of Object.values(TRACE)) delete globals[key];
}

export function makeLoader(isEnabled: () => boolean = () => true): Loader {
	const options: LoaderOptions = {
		isEnabled,
		host: HOST,
		react: HOST_GLOBALS.react,
		jsx: HOST_GLOBALS.jsx,
	};
	return createLoader(options);
}

/** A throwaway plugin: it dates its own import and setup, and clears its marker on dispose. */
export function source(id: string, label: string): string {
	return `
globalThis.${TRACE.imported} = true;
(globalThis.${TRACE.order} = globalThis.${TRACE.order} ?? []).push("${label}:import");
export default { setup() {
	globalThis.${TRACE.order}.push("${label}:setup");
	globalThis.${TRACE.marker} = "${id}:${label}";
	return { dispose() { globalThis.${TRACE.order}.push("${label}:dispose"); delete globalThis.${TRACE.marker}; } };
} };
`;
}

export function manifest(
	id: string,
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		id,
		name: id,
		version: "1.0.0",
		apiVersion: "0.1",
		engines: { app: "*" },
		...overrides,
	};
}

export function request(
	id: string,
	label: string,
	overrides: Record<string, unknown> = {},
): PluginRequest {
	return { manifest: manifest(id, overrides), source: source(id, label) };
}

export const lastFault = () => listFaults().at(-1);

import {
	bareSpecifiers,
	importPluginSource,
	type ModuleImporter,
	type PluginModule,
	setupOf,
} from "@/plugins/blobModule";
import { isDisposable } from "@/plugins/disposable";
import { FAULT_AREAS, FAULT_REASONS, type FaultReason, recordFault } from "@/plugins/faults";
import { missingHostGlobals } from "@/plugins/globals";
import { createInstance, type PluginInstance } from "@/plugins/instance";
import type { LoadOutcome, PluginRequest } from "@/plugins/loader";
import { parseManifest } from "@/plugins/manifest";

/**
 * The loader's two steps, held apart from the instance registry so each reads on
 * its own (spec 040 §The host).
 *
 * `prepare` validates the manifest and imports the entry — it creates no instance
 * and touches nothing that is already running, which is what makes a reload's
 * first phase safe. `start` runs `setup` and keeps its handle. A failure in either
 * is a `PluginFault`, never a throw into the host.
 */

export type Prepared = {
	readonly id: string;
	readonly setup: (host: object) => unknown;
	readonly warnings: readonly string[];
};

export type StepOptions = {
	readonly host: object;
	readonly appVersion: string;
	readonly importModule?: ModuleImporter;
};

export type PreparedResult =
	| { readonly ok: true; readonly prepared: Prepared }
	| { readonly ok: false; readonly outcome: LoadOutcome };

export type StartedResult =
	| { readonly ok: true; readonly instance: PluginInstance }
	| { readonly ok: false; readonly outcome: LoadOutcome };

function refuse(reason: FaultReason, subject: string, message: string): LoadOutcome {
	recordFault({ area: FAULT_AREAS.plugins, reason, subject, message });
	return { status: "refused", id: subject, warnings: [] };
}

/** Validate the manifest, import the entry from a Blob, and read its `setup`. */
export async function prepare(
	request: PluginRequest,
	options: StepOptions,
): Promise<PreparedResult> {
	const parsed = parseManifest(request.manifest, options.appVersion);
	if (!parsed.ok) {
		const { reason, subject, message } = parsed.problem;
		return { ok: false, outcome: refuse(reason, subject, message) };
	}
	const { id } = parsed.manifest;
	const bare = bareSpecifiers(request.source);
	if (bare.length > 0) {
		const names = bare.map((specifier) => `"${specifier}"`).join(", ");
		return {
			ok: false,
			outcome: refuse(
				FAULT_REASONS.bareSpecifier,
				id,
				`the entry for "${id}" still imports ${names}; a built entry must import nothing`,
			),
		};
	}
	let module: PluginModule;
	try {
		module = await importPluginSource(request.source, options.importModule);
	} catch (error) {
		const message = `the entry for "${id}" did not import: ${String(error)}`;
		return { ok: false, outcome: refuse(FAULT_REASONS.importFailed, id, message) };
	}
	const missing = missingHostGlobals();
	if (missing.length > 0) {
		const message = `the entry for "${id}" imported without the host globals ${missing.join(", ")}`;
		return { ok: false, outcome: refuse(FAULT_REASONS.missingGlobals, id, message) };
	}
	const setup = setupOf(module);
	if (setup === null) {
		return {
			ok: false,
			outcome: refuse(
				FAULT_REASONS.noSetup,
				id,
				`the entry for "${id}" exports no setup function`,
			),
		};
	}
	return { ok: true, prepared: { id, setup, warnings: parsed.warnings } };
}

/** Run `setup` and keep the handle it returned, if any. */
export function start(prepared: Prepared, host: object): StartedResult {
	const instance = createInstance(prepared.id);
	try {
		const returned = prepared.setup(host);
		if (isDisposable(returned)) instance.add(returned);
	} catch (error) {
		instance.dispose();
		const message = `setup for "${prepared.id}" threw: ${String(error)}`;
		return { ok: false, outcome: refuse(FAULT_REASONS.setupThrew, prepared.id, message) };
	}
	return { ok: true, instance };
}

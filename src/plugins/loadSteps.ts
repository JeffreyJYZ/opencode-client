import {
	bareSpecifiers,
	importPluginSource,
	type ModuleImporter,
	type PluginModule,
	setupOf,
} from "@/plugins/blobModule";
import { isDisposable } from "@/plugins/disposable";
import { FAULT_AREAS, FAULT_REASONS, type FaultReason, recordFault } from "@/plugins/faults";
import { installPluginHost, missingHostGlobals } from "@/plugins/globals";
import type { HostFactory } from "@/plugins/host";
import type { PluginInstance } from "@/plugins/instance";
import type { LoadOutcome, PluginRequest } from "@/plugins/loader";
import { parseManifest } from "@/plugins/manifest";

/**
 * The loader's two steps, held apart from the instance registry so each reads on
 * its own (spec 040 §The host).
 *
 * `prepare` validates the manifest, builds the plugin's **host** (M4.3), imports
 * the entry and reads its `setup` — it touches nothing that is already running,
 * which is what makes a reload's first phase safe. Every refusal past the host's
 * creation disposes the instance it made, so a refused plugin leaves nothing
 * behind. `start` runs `setup` and keeps its handle. A failure in either is a
 * `PluginFault`, never a throw into the host.
 */

export type Prepared = {
	readonly id: string;
	readonly setup: (host: object) => unknown;
	readonly warnings: readonly string[];
	readonly host: object;
	readonly instance: PluginInstance;
};

export type StepOptions = {
	/** How a plugin's host is built (M4.3); one host per plugin, never shared. */
	readonly createHost: HostFactory;
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

/** Validate the manifest, build the host, import the entry, and read its `setup`. */
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
	// The host exists before the import: the entry reaches it through the
	// `__ocHost` global. A refusal past here disposes the instance, so the plugin
	// leaves nothing behind — not even a signal that would abort on teardown.
	const { host, instance } = options.createHost(id);

	function fail(reason: FaultReason, message: string): PreparedResult {
		instance.dispose();
		return { ok: false, outcome: refuse(reason, id, message) };
	}

	const bare = bareSpecifiers(request.source);
	if (bare.length > 0) {
		const names = bare.map((specifier) => `"${specifier}"`).join(", ");
		return fail(
			FAULT_REASONS.bareSpecifier,
			`the entry for "${id}" still imports ${names}; a built entry must import nothing`,
		);
	}
	installPluginHost(host);
	let module: PluginModule;
	try {
		module = await importPluginSource(request.source, options.importModule);
	} catch (error) {
		return fail(
			FAULT_REASONS.importFailed,
			`the entry for "${id}" did not import: ${String(error)}`,
		);
	}
	const missing = missingHostGlobals();
	if (missing.length > 0) {
		return fail(
			FAULT_REASONS.missingGlobals,
			`the entry for "${id}" imported without the host globals ${missing.join(", ")}`,
		);
	}
	const setup = setupOf(module);
	if (setup === null) {
		return fail(FAULT_REASONS.noSetup, `the entry for "${id}" exports no setup function`);
	}
	return { ok: true, prepared: { id, setup, warnings: parsed.warnings, host, instance } };
}

/** Run `setup` and keep the handle it returned, if any. */
export function start(prepared: Prepared): StartedResult {
	const { instance, host } = prepared;
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

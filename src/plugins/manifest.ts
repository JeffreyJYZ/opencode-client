import { z } from "zod";
import { HOST_API_VERSION } from "@/constants/plugins";
import { isPluginCapability } from "@/plugins/capabilities";
import { satisfiesEngines } from "@/plugins/engines";
import { FAULT_REASONS, type FaultReason } from "@/plugins/faults";
import { PLUGIN_ID_PATTERN } from "@/plugins/pluginId";

/**
 * The `plugin.json` schema (spec 040 §Manifest) — the loader's contract, validated
 * by the stack's own validator (zod). The id rule lives in `pluginId.ts` and is
 * re-exported here, since it is the manifest schema that names it.
 */

export { isPluginId, PLUGIN_ID_PATTERN } from "@/plugins/pluginId";

/** `major.minor`; the only `apiVersion` shape the host reads. */
const API_VERSION_SHAPE = /^\d+\.\d+$/;

const ID_MESSAGE = 'an id is one path component of [A-Za-z0-9._-] with no leading or trailing "."';

export const manifestSchema = z.object({
	id: z.string().regex(PLUGIN_ID_PATTERN, ID_MESSAGE),
	name: z.string().min(1, "a name is required"),
	version: z.string().min(1, "a version is required"),
	apiVersion: z.string().regex(API_VERSION_SHAPE, 'an "apiVersion" looks like "0.1"'),
	entry: z.string().min(1).optional(),
	capabilities: z
		.array(z.string())
		.superRefine((labels, ctx) => {
			for (const label of labels) {
				if (!isPluginCapability(label)) {
					ctx.addIssue({
						code: "custom",
						message: `"${label}" is not a known capability`,
					});
				}
			}
		})
		.optional(),
	engines: z.object({
		app: z.string().min(1, 'an "engines.app" is a version range like ">=0.3.0"'),
	}),
	description: z.string().optional(),
	author: z.string().optional(),
	homepage: z.string().optional(),
});

export type PluginManifest = z.infer<typeof manifestSchema>;

/** Why a manifest was refused, as the loader records it. */
export type ManifestProblem = {
	readonly reason: FaultReason;
	readonly subject: string;
	readonly message: string;
};

export type ManifestResult =
	| { readonly ok: true; readonly manifest: PluginManifest; readonly warnings: readonly string[] }
	| { readonly ok: false; readonly problem: ManifestProblem };

/** Which refusal a failed field maps to, so the fault names the reason it was refused. */
const REASON_BY_FIELD: Record<string, FaultReason> = {
	id: FAULT_REASONS.invalidId,
	capabilities: FAULT_REASONS.unknownCapability,
	apiVersion: FAULT_REASONS.unsupportedApiVersion,
	engines: FAULT_REASONS.enginesApp,
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** What a refusal is about: the manifest's `id` when it has a readable one. */
function subjectOf(value: unknown): string {
	const id = isRecord(value) ? value.id : undefined;
	return typeof id === "string" && id !== "" ? id : "?";
}

/** `major.minor` split; the caller has already matched `API_VERSION_SHAPE`. */
function parts(version: string): { major: number; minor: number } {
	const [major, minor] = version.split(".");
	return { major: Number(major), minor: Number(minor) };
}

function refuse(reason: FaultReason, subject: string, message: string): ManifestResult {
	return { ok: false, problem: { reason, subject, message } };
}

function refusalFor(error: z.ZodError, subject: string): ManifestResult {
	const issue = error.issues[0];
	const field = String(issue?.path[0] ?? "");
	const reason = REASON_BY_FIELD[field] ?? FAULT_REASONS.invalidManifest;
	return refuse(
		reason,
		subject,
		`the manifest for "${subject}" is invalid: ${issue?.message ?? "no reason given"}`,
	);
}

export function parseManifest(value: unknown, appVersion: string): ManifestResult {
	const subject = subjectOf(value);
	if (!isRecord(value))
		return refuse(FAULT_REASONS.invalidManifest, "?", "a manifest must be a JSON object");
	const engines = value.engines;
	if (!isRecord(engines) || typeof engines.app !== "string" || engines.app.trim() === "") {
		return refuse(
			FAULT_REASONS.enginesApp,
			subject,
			`the manifest for "${subject}" declares no "engines.app"`,
		);
	}
	const parsed = manifestSchema.safeParse(value);
	if (!parsed.success) return refusalFor(parsed.error, subject);
	const { id, apiVersion } = parsed.data;
	const host = parts(HOST_API_VERSION);
	const declared = parts(apiVersion);
	if (declared.major !== host.major) {
		return refuse(
			FAULT_REASONS.unsupportedApiVersion,
			id,
			`the plugin "${id}" targets host API ${apiVersion}; this host implements ${HOST_API_VERSION} (a different major)`,
		);
	}
	if (!satisfiesEngines(parsed.data.engines.app, appVersion)) {
		return refuse(
			FAULT_REASONS.enginesApp,
			id,
			`the plugin "${id}" requires app ${parsed.data.engines.app}; this app is ${appVersion}`,
		);
	}
	const warnings =
		declared.minor === host.minor
			? []
			: [
					`the plugin "${id}" targets host API ${apiVersion}; this host implements ${HOST_API_VERSION}`,
				];
	return { ok: true, manifest: parsed.data, warnings };
}

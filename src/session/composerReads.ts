import type {
	AgentInfo,
	CommandInfo,
	FileSystemEntry,
	FormInfo,
	ModelInfo,
	ModelRef,
	OpenCodeClient,
	PermissionRequest,
	SkillInfo,
} from "@opencode/client";

/**
 * The composer's and the docks' **reads** (M2.5/M2.6), the read half of the seam in
 * `actions.ts`. Every server call the composer makes is named here; a read that
 * fails degrades to an empty list rather than throwing into a render, because the
 * prompt box must stay usable while one source is down — the **send** is the call
 * whose failure is visible (spec 010 §Never a silent failure).
 */

/** Run one read; a failure is the caller's fallback, never a throw into a component. */
async function read<T>(call: () => Promise<T>, fallback: T): Promise<T> {
	try {
		return await call();
	} catch {
		return fallback;
	}
}

/**
 * `command.list()` — the server's commands, from the global config's `commands` key.
 * It loads **asynchronously** (`docs/opencode-api.md` §4): an empty first read is
 * normal, which is why the menu's own empty state is not the same word as "loading".
 */
export async function readCommands(client: OpenCodeClient): Promise<readonly CommandInfo[]> {
	return read(async () => (await client.command.list()).data, []);
}

export async function readAgents(client: OpenCodeClient): Promise<readonly AgentInfo[]> {
	return read(async () => (await client.agent.list()).data, []);
}

export async function readModels(client: OpenCodeClient): Promise<readonly ModelInfo[]> {
	return read(async () => (await client.model.list()).data, []);
}

/**
 * The identity of one model entry: **`providerID` and `id` together**, never `id`
 * alone. The server's snapshot is `Map<providerID, Map<modelID, Info>>` and its editor
 * sets `model.id = modelID`, so an `id` is unique **within one provider only** — two
 * providers offering the same model id answer two entries whose `id` is equal and whose
 * `providerID` differs. `Model.Info` carries both fields, and `ModelRef` (what a model
 * switch sends) is exactly this pair; this is the `providerID/id` form the schema's own
 * `Model.Ref.parse` reads. A `<select>` keyed by `id` alone therefore logs a duplicate
 * key and cannot tell the two apart.
 */
export function modelOptionKey(model: Pick<ModelRef, "providerID" | "id">): string {
	return `${model.providerID}/${model.id}`;
}

export async function readSkills(client: OpenCodeClient): Promise<readonly SkillInfo[]> {
	return read(async () => (await client.skill.list()).data, []);
}

/** `file.find` for a mention query; the location is the session's own directory. */
export async function readFileMentions(
	client: OpenCodeClient,
	query: string,
	directory: string | null,
): Promise<readonly FileSystemEntry[]> {
	if (query.trim() === "") return [];
	const input = {
		query,
		limit: FILE_MENTION_LIMIT,
		...(directory === null ? {} : { location: { directory } }),
	} as never;
	return read(async () => (await client.file.find(input)).data, []);
}

/** How many file mentions one query returns (`file.find` takes a limit). */
export const FILE_MENTION_LIMIT = 8;

/** Switch the session's agent (spec 050 §Model/agent switch). */
export async function switchSessionAgent(
	client: OpenCodeClient,
	sessionID: string,
	agent: string,
): Promise<void> {
	await client.session.switchAgent({ sessionID, agent });
}

/** Switch the session's model — and, when set, its variant (the thinking mode). */
export async function switchSessionModel(
	client: OpenCodeClient,
	sessionID: string,
	model: ModelRef,
): Promise<void> {
	await client.session.switchModel({ sessionID, model: { ...model } });
}

/** The session's identity for the prompt box's line: its agent, model and directory. */
export type SessionIdentity = {
	readonly agent: string | null;
	readonly model: ModelRef | null;
	readonly directory: string | null;
};

/** `session.get` — the identity line's values (`agent`, `model`, `location.directory`). */
export async function readSessionIdentity(
	client: OpenCodeClient,
	sessionID: string,
): Promise<SessionIdentity | null> {
	return read<SessionIdentity | null>(async () => {
		const info = await client.session.get({ sessionID });
		return {
			agent: info.agent ?? null,
			model: info.model ?? null,
			directory: info.location?.directory ?? null,
		};
	}, null);
}

/**
 * The session's **pending** permission requests — the dock's own refetch
 * (`M2.1`'s board entry: `session.permissions` and `form.*` were deliberately
 * unheld, so the docks are the rows that own their refetch).
 */
export async function readPendingPermissions(
	client: OpenCodeClient,
	sessionID: string,
): Promise<readonly PermissionRequest[]> {
	return read(async () => client.permission.list({ sessionID }), []);
}

/** The session's pending question forms; the same refetch rule as the permission dock. */
export async function readPendingForms(
	client: OpenCodeClient,
	sessionID: string,
): Promise<readonly FormInfo[]> {
	return read(async () => client.session.form.list({ sessionID }), []);
}

import type {
	McpServer,
	OpenCodeClient,
	PermissionReply,
	SessionPromptInput,
} from "@opencode/client";
import { type FlatPrompt, promptPayloadOf } from "@/session/promptPayload";
import type { PromptRequest } from "@/session/promptTypes";

/**
 * **The one typed seam per server call** (spec 050 §Sessions, commands, replies;
 * `docs/opencode-api.md` §3). Every write the composer and the docks make goes
 * through a function here; no component and no hook calls `client.*` directly, and
 * no component assembles a payload.
 *
 * The two documented traps this file is the single owner of:
 *
 * - **`session.prompt` is flat on the wire** (`docs/opencode-api.md` §4): the
 *   generated `SessionPromptInput` wraps each field as `Payload["field"]` and rides
 *   a vestigial `id`, so a flat literal does not typecheck even though it is what
 *   the server accepts. The flat object is built by `promptPayloadOf` and cast
 *   **here, once**, with the reason: a codegen artefact, not a wire wrapper.
 * - **A permission reply's field is `decision: "once" | "always" | "reject"`**
 *   (same section) — not a generic reply field — and the values the dock shows are
 *   the values that go on the wire.
 */

/** Send one prompt. The only way a prompt leaves the app (requirement 1). */
export async function sendPrompt(client: OpenCodeClient, request: PromptRequest): Promise<void> {
	const flat: FlatPrompt = promptPayloadOf(request);
	// The cast: `SessionPromptInput` is the codegen artefact described above; the
	// flat object is the documented wire shape. One cast, one comment, one place.
	await client.session.prompt(flat as unknown as SessionPromptInput);
}

/**
 * Run one **server command** (`/name` from the server's `command.list()`, spec 050
 * §Commands). It is a different call from a prompt — `session.command`, not
 * `session.prompt` — because that is what makes the server expand its template,
 * arguments and all; sending the text as a prompt would hand the model a literal
 * `/name`. Flat like `session.prompt`, and for the same reason.
 */
export async function runServerCommand(
	client: OpenCodeClient,
	input: { readonly sessionID: string; readonly name: string; readonly text: string },
): Promise<void> {
	await client.session.command({
		sessionID: input.sessionID,
		name: input.name,
		text: input.text,
	});
}

/** Interrupt the running turn. The caller gates this on the store's running flag. */
export async function interruptSession(client: OpenCodeClient, sessionID: string): Promise<void> {
	await client.session.interrupt({ sessionID });
}

/** Answer one permission request with the wire's own decision words. */
export async function replyPermission(
	client: OpenCodeClient,
	input: {
		readonly sessionID: string;
		readonly requestID: string;
		readonly decision: PermissionReply;
	},
): Promise<void> {
	await client.permission.reply({
		sessionID: input.sessionID,
		requestID: input.requestID,
		decision: input.decision,
	});
}

/** Answer one question form: the form's own field keys → its answer values. */
export async function replyForm(
	client: OpenCodeClient,
	input: {
		readonly sessionID: string;
		readonly formID: string;
		readonly answer: Readonly<Record<string, string | number | boolean | readonly string[]>>;
	},
): Promise<void> {
	await client.session.form.reply({
		sessionID: input.sessionID,
		formID: input.formID,
		answer: input.answer,
	});
}

/** Cancel a question form (the dock's Esc), so the asker is told nobody answered. */
export async function cancelForm(
	client: OpenCodeClient,
	input: { readonly sessionID: string; readonly formID: string },
): Promise<void> {
	await client.session.form.cancel({ sessionID: input.sessionID, formID: input.formID });
}

/**
 * Connect one MCP server, by its own name (M2.20, spec 020 §Sidebar). The
 * generated `McpConnectInput` carries an optional `location` beside the
 * required `server`; the name alone is what the experimental route
 * (`POST /api/experimental/mcp/:server/connect`, `docs/opencode-api.md` §5)
 * routes on, so the seam sends exactly the name it was handed.
 */
export async function connectMcpServer(client: OpenCodeClient, name: string): Promise<void> {
	await client.mcp.connect({ server: name });
}

/** Disconnect one MCP server, by its own name — the same route, `/disconnect`. */
export async function disconnectMcpServer(client: OpenCodeClient, name: string): Promise<void> {
	await client.mcp.disconnect({ server: name });
}

/**
 * Re-read the MCP server list after a connect or a disconnect (M2.20). The
 * app ingests no `mcp.status.changed` event, so the slot refetches `mcp.list()`
 * once the action settles and renders what the server then says.
 */
export async function refreshMcpServers(client: OpenCodeClient): Promise<readonly McpServer[]> {
	return (await client.mcp.list()).data;
}

/**
 * Resolve the config path the MCP detail shows (M2.20, spec 020 §Sidebar).
 * `mcp.list()` carries no path (`docs/opencode-api.md` §4), so the seam reads
 * `config.get()` and returns the first document entry that names one — or
 * `null` when none does, which the panel renders as-is rather than inventing.
 */
export async function readMcpConfigPath(client: OpenCodeClient): Promise<string | null> {
	const entries = await client.config.get();
	for (const entry of entries) {
		if (typeof entry.path === "string" && entry.path !== "") return entry.path;
	}
	return null;
}

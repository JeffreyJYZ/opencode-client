import type { Attachment, ComposerMention, PromptRequest } from "@/session/promptTypes";

/**
 * The prompt payload (spec 050 §Sessions, commands, replies; `docs/opencode-api.md`
 * §4). **One builder for every way a prompt leaves the app** — Enter, ⌘↩, a command
 * row, an attachment, a mention — so no component assembles a payload and the flat
 * wire shape is decided in exactly one place.
 *
 * The shape is the flat one the server accepts: `{ sessionID, text, files?,
 * agents?, skills? }`. `actions.ts` is where that object is cast to the generated
 * input type and where the cast is commented; this module stays pure so the shape
 * is unit-testable without a client.
 *
 * Mentions are **structured spans** (`{start, end, text}`, spec 020 §Prompt box),
 * not plain text: a file mention also rides `files[]` with its `uri`, an agent
 * mention `agents[]` with its `name`, a skill mention `skills[]` with its `id`.
 */

export type FlatPrompt = {
	readonly sessionID: string;
	readonly text: string;
	readonly files?: readonly {
		readonly uri: string;
		readonly name?: string;
		readonly mention?: { readonly start: number; readonly end: number; readonly text: string };
	}[];
	readonly agents?: readonly {
		readonly name: string;
		readonly mention?: { readonly start: number; readonly end: number; readonly text: string };
	}[];
	readonly skills?: readonly {
		readonly id: string;
		readonly mention?: { readonly start: number; readonly end: number; readonly text: string };
	}[];
};

/** The span a mention rides with, or `undefined` when the mention has no offsets. */
function spanOf(mention: ComposerMention) {
	if (mention.start < 0) return undefined;
	return { start: mention.start, end: mention.end, text: mention.text };
}

/** The `files[]` entries: the attachments, then the file mentions not already among them. */
function filesOf(request: PromptRequest) {
	const entries: {
		uri: string;
		name?: string;
		mention?: { start: number; end: number; text: string };
	}[] = [];
	const seen = new Set<string>();
	for (const attachment of request.attachments) {
		// An entry with no path is refused before the prompt leaves (requirement 7),
		// so it is not carried at all.
		if (!attachment.sendable || attachment.uri.trim() === "") continue;
		if (seen.has(attachment.uri)) continue;
		seen.add(attachment.uri);
		entries.push(
			attachment.name === undefined
				? { uri: attachment.uri }
				: { uri: attachment.uri, name: attachment.name },
		);
	}
	for (const mention of request.mentions) {
		if (mention.kind !== "file" || seen.has(mention.value)) continue;
		seen.add(mention.value);
		entries.push({ uri: mention.value, name: mention.text, mention: spanOf(mention) });
	}
	return entries;
}

export function promptPayloadOf(request: PromptRequest): FlatPrompt {
	const files = filesOf(request);
	const agents = request.mentions
		.filter((mention) => mention.kind === "agent")
		.map((mention) => ({ name: mention.value, mention: spanOf(mention) }));
	const skills = request.mentions
		.filter((mention) => mention.kind === "skill")
		.map((mention) => ({ id: mention.value, mention: spanOf(mention) }));
	return {
		sessionID: request.sessionID,
		text: request.text,
		...(files.length === 0 ? {} : { files }),
		...(agents.length === 0 ? {} : { agents }),
		...(skills.length === 0 ? {} : { skills }),
	};
}

/** The first attachment a payload cannot carry, or `null`. The box shows it before sending. */
export function unsendableAttachment(attachments: readonly Attachment[]): Attachment | null {
	for (const attachment of attachments) {
		if (!attachment.sendable || attachment.uri.trim() === "") return attachment;
	}
	return null;
}

/**
 * A prompt that **is** a server command, or `null`. A server command is one line
 * whose first token is `/<name>` and whose name the server itself listed; the rest
 * of the line is its text. The match is against the server's own list, so an
 * ordinary path or a fraction (`/etc/hosts`, `1/2`) is never mistaken for a command,
 * and a name the server does not have stays a prompt.
 */
export function serverCommandInvocation(
	text: string,
	names: readonly string[],
): { readonly name: string; readonly text: string } | null {
	const line = text.trim();
	if (line === "" || line.includes("\n")) return null;
	if (!line.startsWith("/")) return null;
	const body = line.slice(1);
	const at = body.search(/\s/);
	const name = at === -1 ? body : body.slice(0, at);
	if (name === "" || !names.includes(name)) return null;
	return { name, text: at === -1 ? "" : body.slice(at).trim() };
}

/**
 * The mentions that are still where they were put. A mention is a **span into the
 * text**, and the user can edit around it; a span whose text no longer matches what
 * was inserted is dropped, so a payload can never point the server at an offset that
 * no longer names the mention. Dropping it leaves the words in the prompt as plain
 * text — the honest failure for an offset that moved.
 */
export function mentionsStillValid(
	text: string,
	mentions: readonly ComposerMention[],
): readonly ComposerMention[] {
	return mentions.filter((mention) => text.slice(mention.start, mention.end) === mention.text);
}

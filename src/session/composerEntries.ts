import type { AgentInfo, CommandInfo, FileSystemEntry, SkillInfo } from "@opencode/client";
import type { ClientCommand } from "@/app/clientCommands";
import {
	COMPOSER_MENTION_KIND,
	COMPOSER_MENTION_PREFIX,
	COMPOSER_SLASH_PREFIX,
	COMPOSER_SOURCE,
} from "@/constants/composer";
import type { MentionKind } from "@/session/promptTypes";

/**
 * The composer menu's **entries** (spec 020 §Prompt box, M2.5): the union of the app's
 * **client commands** and the server's `command.list()`, plus the three `@` mention
 * sources. Split from the token/filter arithmetic next door, because the two change
 * for different reasons — one when a source is added, the other when a key does.
 *
 * **A client command and a server command that share a name are two rows**, each
 * labelled with its source, so "run it here" and "send it as a prompt" are never
 * confused. Accepting a server command inserts `/<name> ` and sends nothing
 * (spec 050 §Commands); a client command runs and inserts nothing.
 */

export type ComposerEntryKind = "command" | "mention";

/** One menu row. `insert` is the text a server command or a mention puts in the box. */
export type ComposerEntry = {
	readonly id: string;
	readonly kind: ComposerEntryKind;
	readonly source: string;
	readonly label: string;
	readonly detail: string;
	/** What accepting the row does to the text: insert this, or nothing for a client command. */
	readonly insert: string | null;
	/** The mention this row records, when it is one. */
	readonly mention?: { readonly kind: MentionKind; readonly value: string };
	/** The client command's id, when it is one: the app runs it. */
	readonly clientCommand?: string;
};

function commandEntry(
	id: string,
	source: string,
	label: string,
	detail: string,
	insert: string | null,
	clientCommand?: string,
): ComposerEntry {
	return { id, kind: "command", source, label, detail, insert, clientCommand };
}

/**
 * The `/` entries: every client command, then every server command. A name both
 * sides claim yields **two rows** — that is the disambiguation the row asks for.
 */
export function buildCommandEntries(
	client: readonly ClientCommand[],
	server: readonly CommandInfo[],
): ComposerEntry[] {
	const entries = client.map((command) =>
		commandEntry(
			`client:${command.name}`,
			COMPOSER_SOURCE.client,
			command.label,
			`${COMPOSER_SLASH_PREFIX}${command.name} · ${command.description}`,
			null,
			command.name,
		),
	);
	for (const command of server) {
		const description = command.description?.trim();
		entries.push(
			commandEntry(
				`server:${command.name}`,
				COMPOSER_SOURCE.server,
				description === undefined || description === "" ? command.name : description,
				`${COMPOSER_SLASH_PREFIX}${command.name}`,
				`${COMPOSER_SLASH_PREFIX}${command.name} `,
			),
		);
	}
	return entries;
}

/** The `@` entries: files, then agents, then skills — each source named on its row. */
export function buildMentionEntries(sources: {
	readonly files: readonly FileSystemEntry[];
	readonly agents: readonly AgentInfo[];
	readonly skills: readonly SkillInfo[];
}): ComposerEntry[] {
	const entries: ComposerEntry[] = [];
	for (const file of sources.files) {
		if (file.type !== "file") continue;
		entries.push({
			id: `file:${file.path}`,
			kind: "mention",
			source: COMPOSER_MENTION_KIND.file,
			label: file.path,
			detail: file.path,
			insert: `${COMPOSER_MENTION_PREFIX}${file.path} `,
			mention: { kind: "file", value: file.path },
		});
	}
	for (const agent of sources.agents) {
		entries.push({
			id: `agent:${agent.name}`,
			kind: "mention",
			source: COMPOSER_MENTION_KIND.agent,
			label: agent.name,
			detail: agent.description?.trim() || `${COMPOSER_MENTION_PREFIX}${agent.name}`,
			insert: `${COMPOSER_MENTION_PREFIX}${agent.name} `,
			mention: { kind: "agent", value: agent.name },
		});
	}
	for (const skill of sources.skills) {
		entries.push({
			id: `skill:${skill.id}`,
			kind: "mention",
			source: COMPOSER_MENTION_KIND.skill,
			label: skill.name,
			detail: skill.description?.trim() || `${COMPOSER_MENTION_PREFIX}${skill.id}`,
			insert: `${COMPOSER_MENTION_PREFIX}${skill.id} `,
			mention: { kind: "skill", value: skill.id },
		});
	}
	return entries;
}

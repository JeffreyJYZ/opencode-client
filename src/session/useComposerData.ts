import type {
	AgentInfo,
	CommandInfo,
	FileSystemEntry,
	ModelInfo,
	SkillInfo,
} from "@opencode/client";
import { useEffect, useMemo, useState } from "react";
import { CLIENT_COMMANDS } from "@/app/clientCommands";
import { COMPOSER_MENTION_PREFIX, COMPOSER_SLASH_PREFIX } from "@/constants/composer";
import { useClient } from "@/session/ClientProvider";
import {
	buildCommandEntries,
	buildMentionEntries,
	type ComposerEntry,
} from "@/session/composerEntries";
import { filterComposerEntries, menuToken } from "@/session/composerMenuModel";
import {
	readAgents,
	readCommands,
	readFileMentions,
	readModels,
	readSkills,
} from "@/session/composerReads";

/**
 * The composer's data path (M2.5): the four sources the menu and the identity line
 * merge, and the entries the token at the caret selects.
 *
 * `command.list()` **loads asynchronously** (`docs/opencode-api.md` §4), so the
 * command source carries its own `loading` flag: the menu shows `Loading commands…`
 * until the first read settles, and only then may it say nothing matches. Agents,
 * models and skills are read once per session; `file.find` runs per mention query,
 * debounced, because it is a filesystem scan.
 */

/** How long a mention query settles before `file.find` runs. */
const MENTION_QUERY_DEBOUNCE_MS = 150;

export type ComposerData = {
	readonly entries: readonly ComposerEntry[];
	/** The token the menu answers to, or `null` (a plain prompt). */
	readonly token: ReturnType<typeof menuToken>;
	/** The server's command list has not answered yet. */
	readonly loadingCommands: boolean;
	/** The server's commands, as listed: their names are what the send path routes on. */
	readonly commands: readonly CommandInfo[];
	readonly agents: readonly AgentInfo[];
	readonly models: readonly ModelInfo[];
	readonly skills: readonly SkillInfo[];
};

export function useComposerData(
	sessionID: string,
	text: string,
	caret: number,
	directory: string | null,
): ComposerData {
	const client = useClient();
	const [commands, setCommands] = useState<readonly CommandInfo[]>([]);
	const [loadingCommands, setLoadingCommands] = useState(true);
	const [agents, setAgents] = useState<readonly AgentInfo[]>([]);
	const [models, setModels] = useState<readonly ModelInfo[]>([]);
	const [skills, setSkills] = useState<readonly SkillInfo[]>([]);
	const [files, setFiles] = useState<readonly FileSystemEntry[]>([]);
	const token = menuToken(text, caret);

	useEffect(() => {
		// The session is a real dependency: switching sessions re-reads every source.
		void sessionID;
		if (client === null) return;
		let cancelled = false;
		setLoadingCommands(true);
		void Promise.all([
			readCommands(client),
			readAgents(client),
			readModels(client),
			readSkills(client),
		]).then(([commandRows, agentRows, modelRows, skillRows]) => {
			if (cancelled) return;
			setCommands(commandRows);
			setAgents(agentRows);
			setModels(modelRows);
			setSkills(skillRows);
			setLoadingCommands(false);
		});
		return () => {
			cancelled = true;
		};
	}, [client, sessionID]);

	// A mention query is the only one that hits the filesystem, and only past a
	// debounce: a keystroke is not a search.
	const mentionQuery = token?.trigger === COMPOSER_MENTION_PREFIX ? token.query : null;
	useEffect(() => {
		if (client === null || mentionQuery === null) {
			setFiles([]);
			return;
		}
		let cancelled = false;
		const timer = window.setTimeout(() => {
			void readFileMentions(client, mentionQuery, directory).then((rows) => {
				if (!cancelled) setFiles(rows);
			});
		}, MENTION_QUERY_DEBOUNCE_MS);
		return () => {
			cancelled = true;
			window.clearTimeout(timer);
		};
	}, [client, mentionQuery, directory]);

	const entries = useMemo(() => {
		if (token === null) return [];
		const all =
			token.trigger === COMPOSER_SLASH_PREFIX
				? buildCommandEntries(CLIENT_COMMANDS, commands)
				: buildMentionEntries({ files, agents, skills });
		return filterComposerEntries(all, token.query);
	}, [token, commands, files, agents, skills]);

	return { entries, token, loadingCommands, commands, agents, models, skills };
}

import type { ModelRef } from "@opencode/client";
import { useCallback, useEffect, useState } from "react";
import { useClient } from "@/session/ClientProvider";
import {
	readSessionIdentity,
	switchSessionAgent,
	switchSessionModel,
} from "@/session/composerReads";

/**
 * The open session's identity for the prompt box's line (M2.5; spec 020 §Prompt
 * box): the agent, the model and the directory, from `session.get`.
 *
 * One read for the composer alone — deliberately not the sidebar's `usePanelData`,
 * which runs five reads for its five panels; the composer needs one. A successful
 * switch updates this state directly as well as the server, so the line does not wait
 * for a refetch to show what the user just chose.
 */

export type SessionIdentityState = {
	readonly agent: string | null;
	readonly model: ModelRef | null;
	readonly directory: string | null;
	readonly setAgent: (agent: string) => Promise<void>;
	readonly setModel: (model: ModelRef) => Promise<void>;
};

export function useSessionIdentity(sessionID: string): SessionIdentityState {
	const client = useClient();
	const [agent, setAgentState] = useState<string | null>(null);
	const [model, setModelState] = useState<ModelRef | null>(null);
	const [directory, setDirectory] = useState<string | null>(null);

	useEffect(() => {
		if (client === null) return;
		let cancelled = false;
		void readSessionIdentity(client, sessionID).then((identity) => {
			if (cancelled || identity === null) return;
			setAgentState(identity.agent);
			setModelState(identity.model);
			setDirectory(identity.directory);
		});
		return () => {
			cancelled = true;
		};
	}, [client, sessionID]);

	const setAgent = useCallback(
		async (next: string) => {
			if (client === null) return;
			await switchSessionAgent(client, sessionID, next);
			setAgentState(next);
		},
		[client, sessionID],
	);

	const setModel = useCallback(
		async (next: ModelRef) => {
			if (client === null) return;
			await switchSessionModel(client, sessionID, next);
			setModelState(next);
		},
		[client, sessionID],
	);

	return { agent, model, directory, setAgent, setModel };
}

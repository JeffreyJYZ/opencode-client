import type { OpenCodeClient, SessionInfo, SessionMessageInfo } from "@opencode/client";
import { SUBAGENT_TOOL_NAME } from "@/constants/transcriptUi";
import { fakeClient, fakeStream } from "@/test/stream";

/**
 * M2.21's board: one session and a client whose panel reads resolve and whose
 * transcript history carries one finished subagent tool part — a shape the server
 * produces, so the statusline counts N = 1 without a hand-shaped store.
 */

export const SUBAGENTS_DIRECTORY = "/tmp/m221-subagents";
export const SUBAGENTS_SESSION_ID = "ses_m221_statusline";

export const SUBAGENTS_SESSION: SessionInfo = {
	id: SUBAGENTS_SESSION_ID,
	projectID: "proj",
	cost: 1.5,
	tokens: { input: 100, output: 20, reasoning: 0, cache: { read: 0, write: 0 } },
	time: { created: 1, updated: 1 },
	location: { directory: SUBAGENTS_DIRECTORY },
};

export type SessionHistory = Record<string, { readonly data: readonly SessionMessageInfo[] }>;

/** One assistant message whose only part is a finished subagent tool call. */
export function subagentHistory(): SessionHistory {
	return {
		[SUBAGENTS_SESSION_ID]: {
			data: [
				{
					id: "msg_m221_sub",
					time: { created: 1, streamed: 2, completed: 3 },
					type: "assistant",
					agent: "build",
					model: { id: "model", providerID: "provider" },
					content: [
						{
							type: "tool",
							id: "tool_m221_sub",
							name: SUBAGENT_TOOL_NAME,
							state: {
								status: "completed",
								input: {},
								content: [{ type: "text", text: "done" }],
							},
							time: { created: 1 },
						},
					],
					finish: "stop",
				},
			],
		},
	};
}

/** The board's client: the stream and history the ingest reads, plus the panels'. */
export function statusSubagentsClient(history: SessionHistory): OpenCodeClient {
	const stream = fakeStream();
	const { client: base } = fakeClient(stream, history);
	return {
		...base,
		session: {
			...base.session,
			get: () => Promise.resolve(SUBAGENTS_SESSION),
			list: () => Promise.resolve({ data: [], cursor: {} }),
			context: () => Promise.resolve([]),
		},
		mcp: {
			list: () => Promise.resolve({ location: { directory: SUBAGENTS_DIRECTORY }, data: [] }),
		},
		vcs: {
			get: () =>
				Promise.resolve({
					location: { directory: SUBAGENTS_DIRECTORY },
					data: { branch: { current: "main" } },
				}),
			status: () =>
				Promise.resolve({ location: { directory: SUBAGENTS_DIRECTORY }, data: [] }),
		},
	} as unknown as OpenCodeClient;
}

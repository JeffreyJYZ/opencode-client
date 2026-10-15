import type { OpenCodeClient } from "@opencode/client";
import { STATUSLINE_BRANCH_SEPARATOR } from "@/constants/statusline";
import { ROW_KIND } from "@/constants/transcript";
import { SUBAGENT_TOOL_NAME } from "@/constants/transcriptUi";
import { lastPathSegment } from "@/pages/homeModel";
import { totalTokens } from "@/session/amounts";
import type { Transcript } from "@/session/transcript";

/**
 * The statusline's figures (spec 020 §Statusline, M2.8).
 *
 * **Tokens and spend are the session's own numbers** (`session.get` →
 * `SessionInfo.tokens` / `.cost`), never a local sum over the stream: the server
 * bills the turn, so the server's figure is the one shown. The subagent count is
 * the session's own transcript (its `subagent` tool rows), so the hint updates
 * with the stream without a second read.
 */

export type StatuslineData = {
	/** The last path segment of the session's directory; `null` before it resolves. */
	readonly directory: string | null;
	readonly branch: string | null;
	readonly subagents: number;
	readonly tokens: number | null;
	readonly spend: number | null;
	readonly running: boolean;
};

/** The two figures that arrive before the branch, plus the path it is read for. */
export type StatuslineRead = {
	readonly directory: string | null;
	readonly fullDirectory: string | null;
	readonly tokens: number | null;
	readonly spend: number | null;
};

/** `~/app` or `~/app: main` — the branch is appended only once it has resolved. */
export function locationLabel(directory: string, branch: string | null): string {
	return branch === null ? directory : `${directory}${STATUSLINE_BRANCH_SEPARATOR} ${branch}`;
}

/** The open session's subagent calls, counted from its own transcript. */
export function countSubagents(transcript: Transcript | undefined): number {
	if (transcript === undefined) return 0;
	let count = 0;
	for (const row of transcript.rows) {
		if (row.kind === ROW_KIND.tool && row.name === SUBAGENT_TOOL_NAME) count += 1;
	}
	return count;
}

/**
 * The figures that arrive **before** the branch: the session's location, tokens
 * and spend. The branch is a second, slower read (`useStatusline`), which is what
 * makes the statusline show the location first and `:branch` after.
 */
export async function readSessionSummary(
	client: OpenCodeClient,
	sessionID: string,
): Promise<StatuslineRead> {
	try {
		const info = await client.session.get({ sessionID });
		const full = info.location.directory;
		return {
			directory: lastPathSegment(full),
			fullDirectory: full,
			tokens: totalTokens(info.tokens),
			spend: info.cost,
		};
	} catch {
		return { directory: null, fullDirectory: null, tokens: null, spend: null };
	}
}

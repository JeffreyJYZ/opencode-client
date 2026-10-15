import { useEffect, useState } from "react";
import { useClient } from "@/session/ClientProvider";
import { countSubagents, readSessionSummary, type StatuslineData } from "@/session/statuslineData";
import { useTranscript } from "@/session/useTranscript";
import { readBranch } from "@/session/vcsBranch";

/**
 * The statusline's data (spec 020 §Statusline, M2.8), read in **two phases** so
 * the branch is never a race with the location:
 *
 * 1. `session.get` resolves the session's own directory, tokens and spend — the
 *    location segment paints from these.
 * 2. only then is `vcs.get` read for that directory (the bounded retry in
 *    `readBranch`), so `:branch` appears **after** the location, never before it
 *    and never as a spinner with no end.
 *
 * The subagent count and the running flag come from the session's own transcript,
 * so they update with the stream without a second read.
 */

export function useStatusline(sessionID: string | null): StatuslineData | null {
	const client = useClient();
	const transcript = useTranscript(sessionID ?? "");
	const [directory, setDirectory] = useState<string | null>(null);
	const [branch, setBranch] = useState<string | null>(null);
	const [tokens, setTokens] = useState<number | null>(null);
	const [spend, setSpend] = useState<number | null>(null);

	useEffect(() => {
		if (client === null || sessionID === null) {
			setDirectory(null);
			setBranch(null);
			setTokens(null);
			setSpend(null);
			return;
		}
		let cancelled = false;
		setBranch(null);
		void readSessionSummary(client, sessionID).then((summary) => {
			if (cancelled) return;
			setDirectory(summary.directory);
			setTokens(summary.tokens);
			setSpend(summary.spend);
			if (summary.fullDirectory === null) return;
			void readBranch(client, summary.fullDirectory).then((resolved) => {
				if (!cancelled) setBranch(resolved);
			});
		});
		return () => {
			cancelled = true;
		};
	}, [client, sessionID]);

	if (sessionID === null) return null;
	return {
		directory,
		branch,
		subagents: countSubagents(transcript),
		tokens,
		spend,
		running: transcript?.running ?? false,
	};
}

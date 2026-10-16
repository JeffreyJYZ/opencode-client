import type { CSSProperties } from "react";
import { SessionComposer } from "@/components/composer/SessionComposer";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { ROUTE_KIND } from "@/constants/routes";
import { SESSION_PAGE_STYLE } from "@/constants/styles";
import { useClient } from "@/session/ClientProvider";
import type { TranscriptRow } from "@/session/transcript";
import { useTranscript } from "@/session/useTranscript";

/**
 * The session surface: the open session's transcript (spec 010 §Routes, spec 050
 * §Event ingest) with the session's input slot beneath it — the prompt box, or the
 * dock that replaces it while a permission or a question is pending (spec 020
 * §Regions).
 *
 * The page **reads the store and nothing else** — `useTranscript` is M2.1's
 * read-only hook, and the composer takes the store's own `running` flag rather than
 * keeping a flag of its own. The store holds a session only while the strip has a tab
 * for it, so a session the app never opened renders the shared empty state rather
 * than fetching on its own.
 *
 * `NO_ROWS` is one module-level array: a fresh `[]` per render would be a new prop
 * on every pass and would defeat `TranscriptView`'s memoised entries.
 */

const NO_ROWS: readonly TranscriptRow[] = [];

/**
 * The page is a column whose transcript cell grows, so the input slot sits under the
 * transcript and stays put while the transcript is longer than the window. The
 * transcript's own scroll contract — tail-follow, unpinning, per-tab memory — is
 * M2.9's; this only gives it the cell it scrolls in.
 */
const PAGE_STYLE: CSSProperties = {
	...SESSION_PAGE_STYLE,
	display: "flex",
	flexDirection: "column",
	height: "100%",
	minHeight: 0,
};

const TRANSCRIPT_CELL_STYLE: CSSProperties = {
	flex: "1 1 0%",
	minHeight: 0,
	overflowY: "auto",
};

export function SessionPage({ id }: { readonly id: string }) {
	const transcript = useTranscript(id);
	const running = transcript?.running ?? false;
	const client = useClient();
	return (
		<main data-route={ROUTE_KIND.session} data-session={id} style={PAGE_STYLE}>
			<div style={TRANSCRIPT_CELL_STYLE}>
				<TranscriptView
					rows={transcript?.rows ?? NO_ROWS}
					sessionID={id}
					running={running}
					client={client}
				/>
			</div>
			<SessionComposer sessionID={id} running={running} />
		</main>
	);
}

import { SessionComposer } from "@/components/composer/SessionComposer";
import { JumpToLatest } from "@/components/transcript/JumpToLatest";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { useTailFollow } from "@/components/transcript/useTailFollow";
import { ROUTE_KIND } from "@/constants/routes";
import { SESSION_PAGE_STYLE, SESSION_VIEW_STYLE } from "@/constants/styles";
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
 * M2.9 adds the transcript's own scroll container: the page's `<main>` is the box
 * `useTailFollow` follows, and the pill is rendered **over** it only while the
 * reader is not following. The remembered position is keyed by the **tab**
 * (`useTailFollow(id, …)`), never by the route or a session id.
 *
 * `NO_ROWS` is one module-level array: a fresh `[]` per render would be a new prop
 * on every pass and would defeat `TranscriptView`'s memoised entries.
 */

const NO_ROWS: readonly TranscriptRow[] = [];

/**
 * The page is a column (`SESSION_VIEW_STYLE`) whose transcript cell grows, so the
 * input slot sits under the transcript and stays put while the transcript is longer
 * than the window.
 */

export function SessionPage({ id }: { readonly id: string }) {
	const transcript = useTranscript(id);
	const follow = useTailFollow(id);
	return (
		<div style={SESSION_VIEW_STYLE}>
			<main
				ref={follow.ref}
				data-route={ROUTE_KIND.session}
				data-session={id}
				data-following={follow.following}
				style={SESSION_PAGE_STYLE}
			>
				<TranscriptView rows={transcript?.rows ?? NO_ROWS} />
			</main>
			{!follow.following && <JumpToLatest onClick={follow.jumpToLatest} />}
			<SessionComposer sessionID={id} running={transcript?.running ?? false} />
		</div>
	);
}

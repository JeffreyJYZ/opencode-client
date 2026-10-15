import { TranscriptView } from "@/components/transcript/TranscriptView";
import { ROUTE_KIND } from "@/constants/routes";
import { SESSION_PAGE_STYLE } from "@/constants/styles";
import type { TranscriptRow } from "@/session/transcript";
import { useTranscript } from "@/session/useTranscript";

/**
 * The session surface: the open session's transcript (spec 010 §Routes, spec 050
 * §Event ingest).
 *
 * The page **reads the store and nothing else** — `useTranscript` is M2.1's
 * read-only hook, and every row is a pure function of the row it is handed. The
 * store holds a session only while the strip has a tab for it, so a session the app
 * never opened renders the shared empty state rather than fetching on its own.
 *
 * `NO_ROWS` is one module-level array: a fresh `[]` per render would be a new prop
 * on every pass and would defeat `TranscriptView`'s memoised entries.
 */

const NO_ROWS: readonly TranscriptRow[] = [];

export function SessionPage({ id }: { readonly id: string }) {
	const transcript = useTranscript(id);
	return (
		<main data-route={ROUTE_KIND.session} data-session={id} style={SESSION_PAGE_STYLE}>
			<TranscriptView rows={transcript?.rows ?? NO_ROWS} />
		</main>
	);
}

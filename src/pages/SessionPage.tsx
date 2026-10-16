import { type CSSProperties, useEffect, useMemo } from "react";
import { SessionComposer } from "@/components/composer/SessionComposer";
import { SlotRegion } from "@/components/Slot";
import { installBandKeys, userBandIds } from "@/components/transcript/bandNav";
import { JumpToLatest } from "@/components/transcript/JumpToLatest";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import { useTailFollow } from "@/components/transcript/useTailFollow";
import { ROUTE_KIND } from "@/constants/routes";
import { SLOT } from "@/constants/slots";
import { SESSION_PAGE_STYLE, SESSION_VIEW_STYLE } from "@/constants/styles";
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
 * M2.9 adds the transcript's own scroll container: the page's `<main>` is the box
 * `useTailFollow` follows, and the pill is rendered **over** it only while the
 * reader is not following. The remembered position is keyed by the **tab**
 * (`useTailFollow(id, …)`), never by the route or a session id.
 *
 * M2.23 adds the band chords: the page owns both halves the handler needs — the
 * rows and the scroller ref — so `installBandKeys` is wired here, over the band ids
 * the store's own `ROW_KIND.user` rows give. A jump writes `scrollTop` directly
 * rather than through the hook, so the scroll event it causes reads as the reader's
 * own gesture (which `useScrollWatch` has just armed): jumping up unpins follow,
 * and a jump that lands on the tail re-pins.
 *
 * `NO_ROWS` is one module-level array: a fresh `[]` per render would be a new prop
 * on every pass and would defeat `TranscriptView`'s memoised entries.
 */

const NO_ROWS: readonly TranscriptRow[] = [];

/**
 * The session's toolbar row (M4.12), above the transcript. It is a `SlotRegion`,
 * so it is absent — not an empty bar — while nothing is registered for
 * `session.toolbar`.
 */
const TOOLBAR_STYLE: CSSProperties = {
	display: "flex",
	alignItems: "center",
	gap: "var(--oc-space-2)",
	width: "100%",
	maxWidth: "var(--oc-content-max-width)",
	margin: "0 auto",
	padding: "var(--oc-space-2) var(--oc-space-4) 0",
};

/**
 * The page is a column (`SESSION_VIEW_STYLE`) whose transcript cell grows, so the
 * input slot sits under the transcript and stays put while the transcript is longer
 * than the window.
 */

export function SessionPage({ id }: { readonly id: string }) {
	const transcript = useTranscript(id);
	const follow = useTailFollow(id);
	const running = transcript?.running ?? false;
	const client = useClient();
	const rows = transcript?.rows ?? NO_ROWS;
	// The bands, memoised on the row list: a press must read the transcript as it is
	// now, and the handler is re-installed only when the bands actually change.
	const bandIds = useMemo(() => userBandIds(rows), [rows]);
	useEffect(() => {
		return installBandKeys(() => ({ scroller: follow.ref.current, bandIds }), {
			scrollTo: (offset) => {
				const scroller = follow.ref.current;
				if (scroller !== null) scroller.scrollTop = offset;
			},
		});
	}, [bandIds, follow.ref]);
	return (
		<div style={SESSION_VIEW_STYLE}>
			<SlotRegion id={SLOT.sessionToolbar} style={TOOLBAR_STYLE} />
			<main
				ref={follow.ref}
				data-route={ROUTE_KIND.session}
				data-session={id}
				data-following={follow.following}
				style={SESSION_PAGE_STYLE}
			>
				<TranscriptView rows={rows} sessionID={id} running={running} client={client} />
			</main>
			{!follow.following && (
				<JumpToLatest count={follow.rowsBelow} onClick={follow.jumpToLatest} />
			)}
			<SessionComposer sessionID={id} running={running} />
		</div>
	);
}

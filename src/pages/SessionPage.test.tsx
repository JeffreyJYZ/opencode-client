import { afterEach, describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { openTab, resetTabs } from "@/app/tabs";
import { TAB_KIND } from "@/constants/tabs";
import { RAIL_LABEL, TRANSCRIPT_EMPTY_LABEL } from "@/constants/transcriptUi";
import { SessionPage } from "@/pages/SessionPage";
import { ClientProvider } from "@/session/ClientProvider";
import { sessionIDOf } from "@/session/eventEnvelope";
import { capturedFrames, sessionOfType } from "@/test/capture";
import { fakeClient, fakeStream } from "@/test/stream";

/**
 * The one seam M2.2 adds to M2.1: **the store is what the page renders**. Frames are
 * the captured ones, pushed through a fake stream into the real ingest, so this
 * asserts the whole chain — frame → store → row → DOM — and not a component in
 * isolation. The two frames are scoped to the captured session that ran a shell: the
 * capture carries two sessions, and a frame for the other one is refused.
 */

afterEach(cleanup);
afterEach(resetTabs);

const frames = await capturedFrames();
const sessionID = sessionOfType(frames, "session.shell.ended");
const streamed = frames.filter((frame) => sessionIDOf(frame) === sessionID);
/** A real prompt: enqueued as `queued`, then reported delivered four frames later. */
const enqueued = streamed.find((frame) => frame.type === "session.inbox.enqueued") as Extract<
	V2Event,
	{ type: "session.inbox.enqueued" }
>;
const delivered = streamed.find(
	(frame) =>
		frame.type === "session.inbox.delivered" && frame.data.inboxID === enqueued.data.inboxID,
) as V2Event;

function renderSession() {
	const stream = fakeStream();
	const { client } = fakeClient(stream, {});
	render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<SessionPage id={sessionID} />
		</ClientProvider>,
	);
	return stream;
}

describe("SessionPage", () => {
	test("a session the app does not hold renders the empty transcript", () => {
		render(
			<ClientProvider
				client={fakeClient(fakeStream()).client}
				probe={() => Promise.resolve()}
			>
				<SessionPage id="ses_not_held" />
			</ClientProvider>,
		);
		expect(screen.getByText(TRANSCRIPT_EMPTY_LABEL)).toBeDefined();
	});

	test("a frame for the open session reaches the transcript, rail included", async () => {
		openTab({ kind: TAB_KIND.session, id: sessionID });
		const stream = renderSession();
		// The ingest's start holds the open tab, so the store accepts its frames.
		await waitFor(() => expect(screen.getByText(TRANSCRIPT_EMPTY_LABEL)).toBeDefined());

		act(() => stream.push(enqueued));
		await waitFor(() => expect(screen.getByText(RAIL_LABEL.queued)).toBeDefined());

		act(() => stream.push(delivered));
		await waitFor(() => expect(screen.getByText(RAIL_LABEL.delivered)).toBeDefined());
	});
});

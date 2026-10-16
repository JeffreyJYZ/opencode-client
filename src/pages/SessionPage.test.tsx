import { afterEach, describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { sessionTab } from "@/app/tabModel";
import { openTab } from "@/app/tabs";
import { JUMP_LATEST_LABEL } from "@/constants/scroll";
import { TAB_KIND } from "@/constants/tabs";
import { RAIL_LABEL, TRANSCRIPT_EMPTY_LABEL } from "@/constants/transcriptUi";
import { SessionPage } from "@/pages/SessionPage";
import { ClientProvider } from "@/session/ClientProvider";
import { sessionIDOf } from "@/session/eventEnvelope";
import { capturedFrames, sessionOfType } from "@/test/capture";
import { resetSettingsState } from "@/test/settings";
import { fakeClient, fakeStream } from "@/test/stream";

/**
 * The one seam M2.2 adds to M2.1: **the store is what the page renders**. Frames are
 * the captured ones, pushed through a fake stream into the real ingest, so this
 * asserts the whole chain — frame → store → row → DOM — and not a component in
 * isolation. The two frames are scoped to the captured session that ran a shell: the
 * capture carries two sessions, and a frame for the other one is refused.
 *
 * M2.9 adds the second seam: the page's `<main>` is the scroll container the
 * tail-follow hook owns, and its `<main data-following>` is what the page renders
 * from that state.
 */

afterEach(cleanup);
afterEach(resetSettingsState);

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

/** happy-dom has no layout engine: the box is measured the way a real one would be. */
function layout(element: HTMLElement, scrollHeight: number, clientHeight: number): void {
	Object.defineProperty(element, "scrollHeight", { value: scrollHeight, configurable: true });
	Object.defineProperty(element, "clientHeight", { value: clientHeight, configurable: true });
}

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

	test("the transcript box follows the tail, and a gesture offers the pill", async () => {
		openTab({ kind: TAB_KIND.session, id: sessionID });
		const stream = renderSession();
		const box = document.querySelector("main") as HTMLElement;
		expect(box.getAttribute("data-following")).toBe("true");
		layout(box, 400, 100);
		act(() => stream.push(enqueued));
		await waitFor(() => expect(box.scrollTop).toBe(300));

		fireEvent.wheel(box, { deltaY: -120 });
		box.scrollTop = 40;
		fireEvent.scroll(box);
		expect(box.getAttribute("data-following")).toBe("false");
		expect(screen.getByText(JUMP_LATEST_LABEL)).toBeDefined();
	});

	test("a tab switch restores that tab's own position", async () => {
		const other = "ses_scroll_other";
		openTab(sessionTab(sessionID));
		openTab(sessionTab(other));
		const stream = fakeStream();
		const { client } = fakeClient(stream, {});
		const view = (id: string) => (
			<ClientProvider client={client} probe={() => Promise.resolve()}>
				<SessionPage id={id} />
			</ClientProvider>
		);
		const { container, rerender } = render(view(sessionID));
		// Mounting holds the tab, and the hold's own refetch resolves a tick later.
		await act(async () => {});
		const box = container.querySelector("main") as HTMLElement;
		layout(box, 400, 100);
		rerender(view(sessionID));
		// The reader scrolls this tab up, then leaves it for another one.
		fireEvent.wheel(box, { deltaY: -120 });
		box.scrollTop = 40;
		fireEvent.scroll(box);
		expect(box.getAttribute("data-following")).toBe("false");

		layout(box, 600, 100);
		rerender(view(other));
		expect(box.getAttribute("data-following")).toBe("true");
		expect(box.scrollTop).toBe(500);

		layout(box, 400, 100);
		rerender(view(sessionID));
		expect(box.getAttribute("data-following")).toBe("false");
		expect(box.scrollTop).toBe(40);
		await act(async () => {});
	});
});

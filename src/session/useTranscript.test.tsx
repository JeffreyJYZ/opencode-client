import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { SessionInboxInfo, V2Event } from "@opencode/client";
import { cleanup, render, waitFor } from "@testing-library/react";
import { resetActivity } from "@/app/sessionActivity";
import { sessionTab } from "@/app/tabModel";
import { openTab, resetTabs } from "@/app/tabs";
import { TARGET_GLOBAL } from "@/constants/server";
import { ROW_KIND } from "@/constants/transcript";
import { ClientProvider } from "@/session/ClientProvider";
import { useTranscript } from "@/session/useTranscript";
import { capturedFrames, sessionOfType } from "@/test/capture";
import { fakeClient, fakeStream } from "@/test/stream";

/**
 * The store → React path: a held tab's transcript updates the hook when a frame
 * arrives. The held set is the **tab store**, which is what `src/app/ingestHooks.ts`
 * wires, so opening a tab here is opening a session the app cares about.
 */

afterEach(cleanup);

const frames = await capturedFrames();
const session = sessionOfType(frames, "session.shell.ended");

function Transcript() {
	const transcript = useTranscript(session);
	const first = transcript?.rows[0];
	return (
		<span data-testid="rows">
			{transcript === undefined ? "none" : `${transcript.rows.length} ${first?.kind ?? ""}`}
		</span>
	);
}

beforeEach(() => {
	resetTabs();
	resetActivity();
	(globalThis as Record<string, unknown>)[TARGET_GLOBAL] = {
		url: "http://127.0.0.1:5251",
		password: "pw",
	};
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>)[TARGET_GLOBAL];
	resetTabs();
});

describe("useTranscript", () => {
	test("a session with no tab open has no transcript", () => {
		const stream = fakeStream();
		const { client } = fakeClient(stream, {});
		render(
			<ClientProvider client={client} probe={async () => {}}>
				<Transcript />
			</ClientProvider>,
		);
		expect(document.querySelector('[data-testid="rows"]')?.textContent).toBe("none");
	});

	test("a held tab's transcript renders once a frame arrives", async () => {
		const stream = fakeStream();
		// The fake server is coherent: the prompt the stream enqueues is still
		// pending in its inbox, so the `server.connected` repair seeds the same
		// queued row the live frame builds — either order lands on one row.
		const enqueued = frames.find(
			(f) => f.type === "session.inbox.enqueued" && f.data.sessionID === session,
		) as Extract<V2Event, { type: "session.inbox.enqueued" }>;
		const pending: readonly SessionInboxInfo[] =
			enqueued.data.item.type === "user"
				? [
						{
							id: enqueued.data.inboxID,
							sessionID: session,
							time: { created: enqueued.created },
							type: "user",
							payload: { text: enqueued.data.item.payload.text },
							delivery: enqueued.data.item.delivery,
						} as SessionInboxInfo,
					]
				: [];
		const { client } = fakeClient(stream, {}, {}, { [session]: pending });
		openTab(sessionTab(session));
		render(
			<ClientProvider client={client} probe={async () => {}}>
				<Transcript />
			</ClientProvider>,
		);
		stream.push(frames.find((f) => f.type === "server.connected") as never);
		stream.push(enqueued as never);
		await waitFor(() =>
			expect(document.querySelector('[data-testid="rows"]')?.textContent).toBe("1 user"),
		);
		expect(ROW_KIND.user).toBe("user");
	});
});

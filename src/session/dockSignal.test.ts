import { describe, expect, test } from "bun:test";
import { createDockSignals, dockSessionIDOf, isDockFrame } from "@/session/dockSignal";
import { createSessionIngest } from "@/session/sessionIngest";
import { createTranscriptStore } from "@/session/transcriptStore";
import { capturedDockFrames } from "@/test/capture";
import { fakeClient, fakeStream } from "@/test/stream";

/**
 * The docks' refetch cue (M2.6). Two facts are asserted here, and the first is the
 * one a hand-written fixture would have got wrong: **a dock frame names its session
 * in two different places** — `permission.asked` at `data.sessionID`,
 * `form.created` at `data.form.sessionID` (`src/test/fixtures/m25-docks-frames.jsonl`,
 * captured from a real 2.0.29 server). The second: a held session's frame ticks the
 * signal, so the dock's refetch is driven by the stream rather than by a poll.
 */

const frames = await capturedDockFrames();
const formCreated = frames.find((frame) => frame.type === "form.created");
const permissionAsked = frames.find((frame) => frame.type === "permission.asked");

describe("a dock frame's session", () => {
	test("`form.created` nests it; `permission.asked` spreads it", () => {
		expect(formCreated).toBeDefined();
		expect(permissionAsked).toBeDefined();
		const formSession = dockSessionIDOf(formCreated as never);
		expect(typeof formSession).toBe("string");
		expect(formSession?.startsWith("ses_")).toBe(true);
		expect(dockSessionIDOf(permissionAsked as never)?.startsWith("ses_")).toBe(true);
		// The two shapes really differ: the spread one is at the top of `data`.
		expect(
			(formCreated as unknown as { data: { sessionID?: string } }).data.sessionID,
		).toBeUndefined();
	});

	test("both are dock frames, and nothing else is", () => {
		expect(isDockFrame(formCreated as never)).toBe(true);
		expect(isDockFrame(permissionAsked as never)).toBe(true);
		expect(isDockFrame({ type: "session.text.delta" } as never)).toBe(false);
	});
});

describe("the ingest's cue", () => {
	test("a held session's captured frames tick its revision, and only it", async () => {
		const stream = fakeStream();
		const { client } = fakeClient(stream);
		const transcripts = createTranscriptStore();
		const signals = createDockSignals();
		const sessionID = dockSessionIDOf(formCreated as never) as string;
		transcripts.hold(sessionID);
		const ingest = createSessionIngest({
			client,
			connection: { reportOnline: () => undefined, reportFailure: () => undefined },
			transcripts,
			activity: {
				setRunning: () => undefined,
				hydrate: () => undefined,
				clear: () => undefined,
			},
			sessions: { held: () => [sessionID], subscribe: () => () => undefined },
			signals,
		});
		ingest.start();
		expect(signals.revision(sessionID)).toBe(0);

		for (const frame of frames) stream.push(frame);
		await Bun.sleep(0);
		expect(signals.revision(sessionID)).toBe(frames.length);
		// A session the app does not hold never ticks.
		expect(signals.revision("ses_not_held")).toBe(0);
		ingest.stop();
	});
});

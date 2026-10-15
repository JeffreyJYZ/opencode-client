import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { ACTIVITY, getActivitySnapshot, resetActivity } from "@/app/sessionActivity";
import { ROW_KIND } from "@/constants/transcript";
import { CONNECTION_STATUS } from "@/session/connectionState";
import { sessionIDOf } from "@/session/eventEnvelope";
import { capturedFrames, capturedMessages, sessionOfType } from "@/test/capture";
import { ingestHarness } from "@/test/ingest";
import { settled } from "@/test/session";

/**
 * The one subscription (spec 050 §Event ingest): the boundary, the held set, the
 * dot and the pip — driven by captured frames and captured `message.list`
 * responses, with no server anywhere. The dropped-stream half is
 * `sessionIngest.gap.test.ts`.
 */

const frames = await capturedFrames();
const messages = await capturedMessages();
const streaming = sessionOfType(frames, "session.shell.ended");
const other = sessionOfType(frames, "session.execution.failed");
const connected = frames.find((f) => f.type === "server.connected") as V2Event;

/** A captured frame of one session — the stream carries both, interleaved. */
function frameOf(sessionID: string, type: string): V2Event {
	const found = frames.find((f) => f.type === type && sessionIDOf(f) === sessionID);
	if (found === undefined) throw new Error(`the capture has no ${type} frame for that session`);
	return found;
}

beforeEach(() => {
	resetActivity();
});

afterEach(() => {
	resetActivity();
});

describe("createSessionIngest", () => {
	test("one subscription, and one refetch per held tab, on start", async () => {
		const { ingest, stream, transcripts, listCalls } = ingestHarness({ held: [streaming] });
		ingest.start();
		await settled();
		expect(stream.subscriptions()).toBe(1);
		expect(transcripts.held()).toEqual([streaming]);
		expect(listCalls()).toEqual([streaming]);
		ingest.stop();
	});

	test("`server.connected` is live: online, a refetch, and the dots hydrated", async () => {
		const { ingest, stream, connection, listCalls, transcripts, sink } = ingestHarness({
			held: [streaming],
			history: messages,
			active: { [streaming]: { type: "running" } },
		});
		ingest.start();
		stream.push(connected);
		await settled();
		await settled();
		expect(connection.getState().status).toBe(CONNECTION_STATUS.online);
		expect(listCalls()).toEqual([streaming, streaming]);
		expect(sink.hydrated).toEqual([streaming]);
		const rows = transcripts.get(streaming)?.rows ?? [];
		expect(rows[0]?.kind).toBe(ROW_KIND.user);
		expect(rows.at(-1)?.kind).toBe(ROW_KIND.footer);
		ingest.stop();
	});

	test("two sessions stream at once and both reduce", async () => {
		const { ingest, stream, transcripts, listCalls } = ingestHarness({
			held: [streaming, other],
		});
		ingest.start();
		stream.push(connected);
		stream.push(frameOf(streaming, "session.execution.started"));
		stream.push(frameOf(other, "session.execution.started"));
		await settled();
		expect(transcripts.get(streaming)?.running).toBe(true);
		expect(transcripts.get(other)?.running).toBe(true);
		stream.push(frameOf(streaming, "session.execution.succeeded"));
		stream.push(frameOf(other, "session.execution.failed"));
		await settled();
		expect(transcripts.get(streaming)?.running).toBe(false);
		expect(transcripts.get(other)?.running).toBe(false);
		expect(transcripts.get(other)?.rows.length).toBeGreaterThan(0);
		expect([...new Set(listCalls())].sort()).toEqual([other, streaming].sort());
		ingest.stop();
	});

	test("a frame for a session nobody opened never reaches the store", async () => {
		const { ingest, stream, transcripts } = ingestHarness({ held: [streaming] });
		ingest.start();
		stream.push(frameOf(other, "session.inbox.enqueued"));
		await settled();
		expect(transcripts.get(other)).toBeUndefined();
		ingest.stop();
	});

	test("the tab dot is event-driven: started lights it and succeeded clears it", async () => {
		const { ingest, stream } = ingestHarness({ held: [streaming], activity: ACTIVITY });
		ingest.start();
		stream.push(frameOf(streaming, "session.execution.started"));
		await settled();
		expect([...getActivitySnapshot()]).toEqual([streaming]);
		stream.push(frameOf(streaming, "session.execution.succeeded"));
		await settled();
		expect([...getActivitySnapshot()]).toEqual([]);
		ingest.stop();
	});

	test("the unread pip fires on output frames, not on a status change", async () => {
		// No server history: the stream is the only source, so nothing an earlier
		// refetch marked as finished can mask the delta.
		const { ingest, stream, outputs } = ingestHarness({ held: [streaming] });
		ingest.start();
		stream.push(frameOf(streaming, "session.execution.started"));
		await settled();
		expect(outputs).toEqual([]);
		stream.push(frameOf(streaming, "session.text.delta"));
		await settled();
		expect(outputs).toEqual([streaming]);
		ingest.stop();
	});

	test("stop tears the subscription down and clears the dots", async () => {
		const { ingest, stream } = ingestHarness({ held: [streaming], activity: ACTIVITY });
		ingest.start();
		stream.push(connected);
		stream.push(frameOf(streaming, "session.execution.started"));
		await settled();
		expect([...getActivitySnapshot()]).toEqual([streaming]);
		ingest.stop();
		expect(getActivitySnapshot().size).toBe(0);
		expect(stream.subscriptions()).toBe(1);
	});
});

import { describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { RECONNECT_BASE_MS } from "@/constants/server";
import { CONNECTION_STATUS } from "@/session/connectionState";
import { sessionIDOf } from "@/session/eventEnvelope";
import { capturedFrames, capturedMessages, sessionOfType } from "@/test/capture";
import { ingestHarness } from "@/test/ingest";
import { settled } from "@/test/session";

/**
 * Gap repair (spec 050 §Event ingest): a dropped stream, a bounded reconnect, a
 * refetch, and a store that ends consistent — with **no replayed event**.
 */

const frames = await capturedFrames();
const messages = await capturedMessages();
const streaming = sessionOfType(frames, "session.shell.ended");
const connected = frames.find((f) => f.type === "server.connected") as V2Event;

function frameOf(sessionID: string, type: string): V2Event {
	const found = frames.find((f) => f.type === type && sessionIDOf(f) === sessionID);
	if (found === undefined) throw new Error(`the capture has no ${type} frame for that session`);
	return found;
}

describe("gap repair", () => {
	test("a dropped stream goes offline, reconnects on the backoff, and replays nothing", async () => {
		const { ingest, stream, connection, clock, transcripts } = ingestHarness({
			held: [streaming],
			history: messages,
		});
		ingest.start();
		stream.push(connected);
		await settled();
		await settled();
		const repaired = transcripts.get(streaming)?.rows.length ?? -1;
		expect(repaired).toBeGreaterThan(0);

		stream.end();
		await settled();
		expect(connection.getState().status).toBe(CONNECTION_STATUS.offline);
		expect(clock.delays()).toEqual([RECONNECT_BASE_MS]);

		await clock.runNext();
		await settled();
		expect(stream.subscriptions()).toBe(2);
		stream.push(connected);
		await settled();
		await settled();
		expect(connection.getState().status).toBe(CONNECTION_STATUS.online);
		expect(transcripts.get(streaming)?.rows.length).toBe(repaired);

		// The refetch replaced the rows; re-applying a frame it already contains
		// keeps the count, because the row id is the one the refetch produced.
		stream.push(frameOf(streaming, "session.text.ended"));
		expect(transcripts.get(streaming)?.rows.length).toBe(repaired);
		ingest.stop();
	});

	test("a stream that never reached the server schedules no reconnect", async () => {
		const { ingest, stream, connection, clock } = ingestHarness({ held: [streaming] });
		ingest.start();
		stream.end(new Error("ECONNREFUSED"));
		await settled();
		expect(connection.getState().status).toBe(CONNECTION_STATUS.offline);
		expect(clock.pending()).toBe(0);
		ingest.stop();
	});

	test("the idle watchdog treats a silent live stream as dead", async () => {
		const { ingest, stream, connection, clock, sink } = ingestHarness({ held: [streaming] });
		ingest.start();
		stream.push(connected);
		await settled();
		expect(connection.getState().status).toBe(CONNECTION_STATUS.online);
		await clock.runNext();
		expect(connection.getState().status).toBe(CONNECTION_STATUS.offline);
		expect(sink.running.size).toBe(0);
		ingest.stop();
	});
});

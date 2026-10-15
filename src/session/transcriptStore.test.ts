import { describe, expect, test } from "bun:test";
import type { V2Event } from "@opencode/client";
import { INGEST_OUTCOME, ROW_KIND } from "@/constants/transcript";
import { sessionIDOf } from "@/session/eventEnvelope";
import { createTranscriptStore } from "@/session/transcriptStore";
import { capturedFrames, sessionOfType } from "@/test/capture";

/** The ingest rules (spec 050 §Event ingest), against captured frames. */

const frames = await capturedFrames();
const held = sessionOfType(frames, "session.shell.ended");
const other = sessionOfType(frames, "session.execution.failed");
const forSession = (sessionID: string) => frames.filter((f) => sessionIDOf(f) === sessionID);
const firstOf = (sessionID: string, type: string) => {
	const frame = forSession(sessionID).find((f) => f.type === type);
	if (frame === undefined) throw new Error(`no ${type} frame`);
	return frame;
};

describe("createTranscriptStore", () => {
	test("a frame for a held session reduces and publishes once", () => {
		const store = createTranscriptStore();
		let published = 0;
		store.subscribe(() => published++);
		store.hold(held);
		expect(published).toBe(1);
		expect(store.ingest(firstOf(held, "session.execution.started"))).toBe(
			INGEST_OUTCOME.reduced,
		);
		expect(store.get(held)?.running).toBe(true);
		expect(published).toBe(2);
	});

	test("holding is idempotent and holds nothing for a session nobody opened", () => {
		const store = createTranscriptStore();
		store.hold(held);
		store.hold(held);
		expect(store.held()).toEqual([held]);
		expect(store.get(other)).toBeUndefined();
	});

	test("a frame for a session the app has never opened is refused, not buffered", () => {
		const store = createTranscriptStore();
		store.hold(held);
		const frame = firstOf(other, "session.inbox.enqueued");
		expect(store.ingest(frame)).toBe(INGEST_OUTCOME.refused);
		expect(store.get(other)).toBeUndefined();
		expect(store.get(held)?.rows).toHaveLength(0);
	});

	test("a frame with no sessionID is ignored — another row's surface", () => {
		const store = createTranscriptStore();
		store.hold(held);
		const transport = frames.find((f) => f.type === "vcs.branch.updated") as V2Event;
		expect(sessionIDOf(transport)).toBeUndefined();
		expect(store.ingest(transport)).toBe(INGEST_OUTCOME.ignored);
	});

	test("a repeated event id is a duplicate", () => {
		const store = createTranscriptStore();
		store.hold(held);
		const frame = firstOf(held, "session.execution.started");
		expect(store.ingest(frame)).toBe(INGEST_OUTCOME.reduced);
		expect(store.ingest(frame)).toBe(INGEST_OUTCOME.duplicate);
	});

	test("a durable frame at or below the watermark is stale and dropped", () => {
		const store = createTranscriptStore();
		store.hold(held);
		const late = firstOf(held, "session.inbox.delivered");
		const earlier = firstOf(held, "session.inbox.enqueued");
		// Delivered first (the server would not, but an out-of-order frame can).
		expect(store.ingest(late)).toBe(INGEST_OUTCOME.reduced);
		expect(store.ingest(earlier)).toBe(INGEST_OUTCOME.duplicate);
		expect(store.get(held)?.rows).toHaveLength(0);
	});

	test("a type no row comes from is ignored and leaves the watermark alone", () => {
		const store = createTranscriptStore();
		store.hold(held);
		expect(store.ingest(firstOf(held, "session.renamed"))).toBe(INGEST_OUTCOME.ignored);
		expect(store.get(held)?.lastSeq).toBe(-1);
		expect(store.get(held)?.rows).toHaveLength(0);
	});

	test("resync replaces the rows, resets the watermark and drops the id memory", () => {
		const store = createTranscriptStore();
		store.hold(held);
		store.ingest(firstOf(held, "session.execution.started"));
		store.resync(held, [
			{ id: "row", created: 1, seq: 0, kind: ROW_KIND.notice, text: "from a refetch" },
		]);
		expect(store.get(held)?.rows).toHaveLength(1);
		expect(store.get(held)?.lastSeq).toBe(-1);
		expect(store.ingest(firstOf(held, "session.execution.started"))).toBe(
			INGEST_OUTCOME.reduced,
		);
	});

	test("session.deleted releases the transcript", () => {
		const store = createTranscriptStore();
		store.hold(held);
		// Derived from a captured frame's envelope: deleting a capture session is
		// not something the capture can contain.
		const deleted = {
			...firstOf(held, "session.created"),
			id: "evt_deleted",
			type: "session.deleted",
		} as unknown as V2Event;
		expect(store.ingest(deleted)).toBe(INGEST_OUTCOME.reduced);
		expect(store.held()).toEqual([]);
	});
});

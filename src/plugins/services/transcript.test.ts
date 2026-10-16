import { describe, expect, test } from "bun:test";
import { ROW_KIND, TOOL_STATUS } from "@/constants/transcript";
import { createPluginTranscript } from "@/plugins/services/transcript";
import {
	emptyTranscript,
	type ToolRow,
	type Transcript,
	type TranscriptRow,
} from "@/session/transcript";

/**
 * `transcript.snapshot()` (M4.4, spec 040 §The host): a **projection, not the
 * store**. What a plugin receives is a fresh, deep-frozen copy, so a mutation
 * throws and cannot reach the session's own rows.
 */

const row: TranscriptRow = {
	id: "row-1",
	created: 1,
	seq: 1,
	kind: ROW_KIND.notice,
	text: "hello",
};

function transcript(): Transcript {
	return { ...emptyTranscript("ses_m44"), rows: [row] };
}

describe("transcript.snapshot", () => {
	test("with no open session it is null id and no rows", () => {
		const service = createPluginTranscript(() => undefined);
		const first = service.snapshot();
		expect(first.sessionID).toBeNull();
		expect(first.rows).toHaveLength(0);
		expect(service.snapshot().rows).toBe(first.rows);
	});

	test("it copies the session's id and rows", () => {
		const service = createPluginTranscript(transcript);
		const snapshot = service.snapshot();
		expect(snapshot.sessionID).toBe("ses_m44");
		expect(snapshot.rows).toHaveLength(1);
		expect(snapshot.rows[0]).toEqual(row);
		expect(snapshot.rows[0]).not.toBe(row);
	});

	test("a mutation throws and cannot reach the store", () => {
		const live = transcript();
		const service = createPluginTranscript(() => live);
		const snapshot = service.snapshot();
		expect(() => {
			(snapshot.rows[0] as { text: string }).text = "hacked";
		}).toThrow();
		expect(() => {
			(snapshot.rows as TranscriptRow[]).push(row);
		}).toThrow();
		expect(live.rows[0]).toBe(row);
		expect((live.rows[0] as { text: string }).text).toBe("hello");
	});

	test("a nested payload is copied and frozen too", () => {
		const nested: ToolRow = {
			id: "row-2",
			created: 2,
			seq: 2,
			kind: ROW_KIND.tool,
			name: "read",
			input: "{}",
			status: TOOL_STATUS.ok,
			output: { kept: "out", dropped: 0 },
		};
		const live: Transcript = { ...emptyTranscript("ses_m44"), rows: [nested] };
		const snapshot = createPluginTranscript(() => live).snapshot();
		const copied = snapshot.rows[0] as ToolRow;
		expect(copied.output).not.toBe(nested.output);
		expect(() => {
			(copied.output as { kept: string }).kept = "hacked";
		}).toThrow();
		expect(nested.output.kept).toBe("out");
	});
});

import { describe, expect, test } from "bun:test";
import { DELIVERY, ROW_KIND } from "@/constants/transcript";
import { sessionIDOf } from "@/session/eventEnvelope";
import { emptyTranscript, type FooterRow, type Transcript } from "@/session/transcript";
import { reduceTranscript } from "@/session/transcriptReducer";
import { capturedFrames, sessionOfType } from "@/test/capture";

/**
 * Every frame here is **captured**, not written by hand: `src/test/fixtures/
 * m21-stream.jsonl` is 66 frames from a real 2.0.29 server, two sessions, still
 * interleaved in the order the stream delivered them.
 */

const frames = await capturedFrames();
const streaming = sessionOfType(frames, "session.shell.ended");
const failed = sessionOfType(frames, "session.execution.failed");

function reduce(sessionID: string): Transcript {
	let transcript = emptyTranscript(sessionID);
	for (const frame of frames) {
		if (sessionIDOf(frame) !== sessionID) continue;
		transcript = reduceTranscript(transcript, frame) ?? transcript;
	}
	return transcript;
}

describe("reduceTranscript — against captured frames", () => {
	test("both sessions reduce from one interleaved stream", () => {
		expect(reduce(streaming).rows.length).toBeGreaterThan(0);
		expect(reduce(failed).rows.length).toBeGreaterThan(0);
	});

	test("prose takes the `.ended` text, not the deltas", () => {
		const prose = reduce(streaming).rows.filter((row) => row.kind === ROW_KIND.prose);
		expect(prose).toHaveLength(2);
		expect((prose[0] as { text: { kept: string } }).text.kept).toBe(
			"Hi! How can I help you today?",
		);
		expect((prose[1] as { ended: boolean }).ended).toBe(true);
	});

	test("reasoning is its own row family", () => {
		const reasoning = reduce(streaming).rows.filter((row) => row.kind === ROW_KIND.reasoning);
		expect(reasoning).toHaveLength(2);
		expect((reasoning[0] as { text: { kept: string } }).text.kept).toContain(
			'The user said "hello"',
		);
	});

	test("the user band starts queued and the delivered frame flips it", () => {
		const users = reduce(failed).rows.filter((row) => row.kind === ROW_KIND.user);
		expect(users).toHaveLength(2);
		expect(users.map((row) => (row as { text: string }).text)).toEqual([
			"seeded, no model",
			"hello",
		]);
		expect(
			users.every((row) => (row as { delivery: string }).delivery === DELIVERY.delivered),
		).toBe(true);
	});

	test("shell keeps `output.output`, the paged object's one string", () => {
		const shells = reduce(streaming).rows.filter((row) => row.kind === ROW_KIND.shell);
		expect(shells).toHaveLength(1);
		const row = shells[0] as {
			command: string;
			output: { kept: string };
			status: string;
		};
		expect(row.command).toBe("printf 'm21 shell line\\n'");
		expect(row.output.kept).toBe("m21 shell line\n");
		expect(row.status).toBe("exited");
	});

	test("a step footer carries the step's own agent, model, span and tokens", () => {
		const footers = reduce(streaming).rows.filter(
			(row) => row.kind === ROW_KIND.footer,
		) as FooterRow[];
		expect(footers).toHaveLength(2);
		// `session.step.started` (1792072635860) → `session.step.ended` (1792072637436).
		expect(footers[0]).toMatchObject({
			agent: "build",
			model: { id: "cat-jam-free", providerID: "opencode" },
			durationMs: 1576,
			outputTokens: 13,
		});
	});

	test("a failed step is a footer plus an error row, and execution clears running", () => {
		const rows = reduce(failed).rows;
		const footer = rows.find((row) => row.kind === ROW_KIND.footer) as FooterRow;
		// The failed payload carries no tokens, so the footer has none to print — but
		// its agent, model and span are the step's own (`step.started` → `step.failed`).
		expect(footer).toMatchObject({
			agent: "build",
			model: { id: "exo-free", providerID: "opencode" },
			durationMs: 1798,
		});
		expect(footer.outputTokens).toBeUndefined();
		const errors = rows.filter((row) => row.kind === ROW_KIND.error);
		expect(errors.length).toBe(2);
		expect((errors[0] as { message: string }).message).toBe(
			"Model exo-free has been deprecated.",
		);
		expect(reduce(failed).running).toBe(false);
	});

	test("the session is running between `execution.started` and its end", () => {
		let transcript = emptyTranscript(streaming);
		for (const frame of frames) {
			if (sessionIDOf(frame) !== streaming) continue;
			transcript = reduceTranscript(transcript, frame) ?? transcript;
			if (frame.type === "session.execution.started") break;
		}
		expect(transcript.running).toBe(true);
	});
});

import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { TranscriptEntry } from "@/components/transcript/TranscriptEntry";
import { ROW_KIND } from "@/constants/transcript";
import { REASONING_EXPANDED_ATTR, REASONING_LABEL } from "@/constants/transcriptUi";
import { capPayload } from "@/session/payloadCaps";
import type { TextRow } from "@/session/transcript";

/** This importer is not the suite's first, so it cleans up after itself. */
afterEach(cleanup);

/**
 * The prose row's own head (M2.32): the agent name only, in the meta tone —
 * never the footer's model/duration/rate. A part whose message carried no
 * agent renders no head: absent, never a placeholder.
 */

const textRow = (kind: TextRow["kind"], text: string, id: string, agent?: string): TextRow => ({
	id,
	created: 1,
	seq: 2,
	kind,
	text: capPayload(text),
	ended: false,
	...(agent === undefined ? {} : { agent }),
});

describe("the prose role head", () => {
	test("prose heads itself with its own agent name", () => {
		render(
			<TranscriptEntry row={textRow(ROW_KIND.prose, "Hello there.", "msg_a:t0", "build")} />,
		);
		expect(screen.getByText("build")).toBeDefined();
		expect(screen.getByText("Hello there.")).toBeDefined();
	});

	test("prose with no agent renders no head — absent, never a placeholder", () => {
		const { container } = render(
			<TranscriptEntry row={textRow(ROW_KIND.prose, "Hello there.", "msg_a:t0")} />,
		);
		expect(container.querySelector("header")).toBeNull();
	});

	test("reasoning with an agent shows no second head — its group names itself", () => {
		const { container } = render(
			<TranscriptEntry
				row={textRow(ROW_KIND.reasoning, "Let me think.", "msg_a:r0", "build")}
			/>,
		);
		expect(screen.queryByText("build")).toBeNull();
		expect(container.querySelector(`[${REASONING_EXPANDED_ATTR}]`)?.textContent).toContain(
			REASONING_LABEL,
		);
	});
});

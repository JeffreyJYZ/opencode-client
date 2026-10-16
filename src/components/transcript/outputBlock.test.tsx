import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { OutputBlock } from "@/components/transcript/OutputBlock";
import { TranscriptView } from "@/components/transcript/TranscriptView";
import {
	NOTICE,
	PAYLOAD_MAX_CHARS,
	ROW_KIND,
	TOOL_CONTENT_MAX_CHARS,
	TOOL_STATUS,
} from "@/constants/transcript";
import { MORE_LINES_ATTR, OUTPUT_COLLAPSE_LABEL } from "@/constants/transcriptUi";
import { capPayload, lineBreaks } from "@/session/payloadCaps";
import type { NoticeRow, ToolRow, TranscriptRow } from "@/session/transcript";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);

/**
 * The collapsed block (M2.4): the render cap, the `(N more lines)` count and the
 * expand/collapse affordance — and the claim that **the count is the store's truth
 * plus this render's own**, never a number a component invented.
 *
 * Rows here are built by `capPayload`, the ingest's own function, so a fixture
 * cannot be a payload the store could not hold.
 */

/** A tool row whose output is `count` terminated lines. */
function toolRow(count: number): ToolRow {
	return {
		id: "tool_caps",
		created: 1,
		seq: 1,
		kind: ROW_KIND.tool,
		name: "read",
		input: '{"path":"src/big.ts"}',
		status: TOOL_STATUS.ok,
		output: capPayload("line\n".repeat(count)),
		anchor: "src/big.ts",
	};
}

const NOTICE_ROW: NoticeRow = {
	id: "notice:compaction",
	created: 2,
	seq: 2,
	kind: ROW_KIND.notice,
	text: NOTICE.compacted,
};

function moreLines(container: HTMLElement): number {
	const button = container.querySelector(`[${MORE_LINES_ATTR}]`);
	if (button === null) throw new Error("the block is not collapsed");
	return Number(button.getAttribute(MORE_LINES_ATTR));
}

function outputOf(container: HTMLElement): string {
	return container.querySelector("pre")?.textContent ?? "";
}

describe("a collapsed output block", () => {
	test("shows the render cap's head and counts the lines it hides", () => {
		const row = toolRow(600);
		const { container } = render(<OutputBlock output={row.output} />);
		const shown = outputOf(container);
		expect(shown).toHaveLength(TOOL_CONTENT_MAX_CHARS);
		expect(moreLines(container)).toBe(lineBreaks(row.output.kept) - lineBreaks(shown));
		expect(moreLines(container)).toBe(200);
	});

	test("expands to the capped payload — the whole thing the store kept, never more", () => {
		const output = capPayload(`${"x".repeat(PAYLOAD_MAX_CHARS)}${"line\n".repeat(4)}`);
		const { container } = render(<OutputBlock output={output} />);
		fireEvent.click(screen.getByRole("button"));
		expect(outputOf(container)).toBe(output.kept);
		expect(outputOf(container)).toHaveLength(PAYLOAD_MAX_CHARS);
		expect(screen.getByText(OUTPUT_COLLAPSE_LABEL)).toBeDefined();
	});

	test("adds the ingest's own dropped lines to the count it hides", () => {
		const output = capPayload(`${"x".repeat(PAYLOAD_MAX_CHARS)}${"line\n".repeat(5)}`);
		const { container } = render(<OutputBlock output={output} />);
		expect(output.dropped).toBe(5);
		const shown = outputOf(container);
		expect(moreLines(container)).toBe(
			output.dropped + lineBreaks(output.kept) - lineBreaks(shown),
		);
	});

	test("renders nothing at all for a row with no output", () => {
		const { container } = render(<OutputBlock output={capPayload("")} />);
		expect(container.querySelector("pre")).toBeNull();
		expect(container.querySelector(`[${MORE_LINES_ATTR}]`)).toBeNull();
	});
});

describe("the count is the row's, not the list's", () => {
	test("a later row does not change a collapsed block's count", () => {
		const rows: TranscriptRow[] = [toolRow(600)];
		const { container, rerender } = render(<TranscriptView rows={rows} />);
		const before = moreLines(container);
		rerender(<TranscriptView rows={[...rows, NOTICE_ROW]} />);
		expect(screen.getByText(NOTICE.compacted)).toBeDefined();
		expect(moreLines(container)).toBe(before);
	});
});

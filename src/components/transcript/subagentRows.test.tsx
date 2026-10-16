import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TranscriptEntry } from "@/components/transcript/TranscriptEntry";
import { ROW_KIND, TOOL_STATUS, type ToolStatus } from "@/constants/transcript";
import {
	SUBAGENT_CONTINUATION_MARK,
	SUBAGENT_LABEL,
	SUBAGENT_TOOL_NAME,
} from "@/constants/transcriptUi";
import { capPayload } from "@/session/payloadCaps";
import type { ToolRow } from "@/session/transcript";
import { flush } from "@/test/act";
import { openTabIds, resetSettingsState } from "@/test/settings";

/**
 * The subagent row's own proof (M2.18; spec 020 §Transcript): agent first, the
 * kind word, description, model, `↳` for a continuation, and the child id as a
 * button through the shared `openSessionAndGo` seam. Split from
 * `toolRows.test.tsx` — one family per file under the 150-line cap.
 */

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);
beforeEach(resetSettingsState);

const subagent = (input: string, over: Partial<ToolRow> = {}): ToolRow => ({
	id: "tool_sub",
	created: 1,
	seq: 1,
	kind: ROW_KIND.tool,
	name: SUBAGENT_TOOL_NAME,
	input,
	status: TOOL_STATUS.ok as ToolStatus,
	output: capPayload(""),
	anchor: undefined,
	...over,
});

describe("a subagent row", () => {
	test("reads agent, word, description and model from its own input", () => {
		const input = JSON.stringify({
			agent: "builder",
			description: "Wire the rows",
			prompt: "…",
			model: "opencode/cat-jam-free",
		});
		render(<TranscriptEntry row={subagent(input)} />);
		expect(screen.getByText("builder")).toBeDefined();
		expect(screen.getByText(SUBAGENT_LABEL)).toBeDefined();
		expect(screen.getByText("Wire the rows", { exact: false })).toBeDefined();
		expect(screen.getByText("opencode/cat-jam-free", { exact: false })).toBeDefined();
	});

	test("a field the input did not carry is left off, never an empty slot", () => {
		const input = JSON.stringify({ agent: "builder", description: "Wire the rows" });
		const { container } = render(<TranscriptEntry row={subagent(input)} />);
		expect(screen.getByText("builder")).toBeDefined();
		expect(container.textContent).not.toContain("·");
		expect(container.querySelector("button")).toBeNull();
	});

	test("falls back to its kind word while the input is still streaming", () => {
		const { container } = render(
			<TranscriptEntry row={subagent('{"agent":"bui', { status: TOOL_STATUS.streaming })} />,
		);
		expect(screen.getByText(SUBAGENT_LABEL)).toBeDefined();
		expect(container.textContent).not.toContain("bui");
	});

	test("a continuation is marked and its child id opens that child in a new tab", async () => {
		const input = JSON.stringify({
			agent: "builder",
			description: "Continue",
			sessionID: "ses_x",
		});
		render(<TranscriptEntry row={subagent(input)} />);
		expect(screen.getByText(SUBAGENT_CONTINUATION_MARK)).toBeDefined();
		fireEvent.click(screen.getByRole("button", { name: "ses_x" }));
		await flush();
		expect(openTabIds()).toContain("ses_x");
	});

	test("a fresh call carries no continuation mark and no click affordance", () => {
		const input = JSON.stringify({ agent: "builder", description: "Fresh" });
		const { container } = render(<TranscriptEntry row={subagent(input)} />);
		expect(container.textContent).not.toContain(SUBAGENT_CONTINUATION_MARK);
		expect(container.querySelector("button")).toBeNull();
	});
});

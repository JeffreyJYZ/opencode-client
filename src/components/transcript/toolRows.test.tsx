import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { TranscriptEntry } from "@/components/transcript/TranscriptEntry";
import { ROW_KIND, TOOL_STATUS, type ToolStatus } from "@/constants/transcript";
import {
	SHELL_LABEL,
	SUBAGENT_LABEL,
	SUBAGENT_TOOL_NAME,
	TOOL_STATUS_LABEL,
	TOOL_UNNAMED,
} from "@/constants/transcriptUi";
import type { ShellRow, ToolRow } from "@/session/transcript";

/** RTL installs auto-cleanup once per process; this importer adds its own. */
afterEach(cleanup);

const toolRow = (over: Partial<ToolRow> = {}): ToolRow => ({
	id: "tool_a",
	created: 1,
	seq: 1,
	kind: ROW_KIND.tool,
	name: "read",
	input: '{"path":"src/a.ts"}',
	status: TOOL_STATUS.ok as ToolStatus,
	output: "line one\n",
	anchor: "src/a.ts",
	...over,
});

describe("a tool row", () => {
	test("says what ran, where it anchored and how it ended", () => {
		const { container } = render(<TranscriptEntry row={toolRow()} />);
		expect(container.querySelector('[data-row="tool_a"]')).not.toBeNull();
		expect(screen.getByText("read")).toBeDefined();
		expect(screen.getByText("src/a.ts")).toBeDefined();
		expect(container.querySelector("[data-status]")?.getAttribute("data-status")).toBe(
			TOOL_STATUS.ok,
		);
		expect(screen.getByText(TOOL_STATUS_LABEL.ok)).toBeDefined();
		// The output is the `<pre>`'s own text, whitespace included.
		expect(container.querySelector("pre")?.textContent).toBe("line one\n");
	});

	test("a call whose name has not arrived names itself and stays running", () => {
		const { container } = render(
			<TranscriptEntry
				row={toolRow({
					name: "",
					status: TOOL_STATUS.streaming,
					anchor: undefined,
					output: "",
				})}
			/>,
		);
		expect(screen.getByText(TOOL_UNNAMED)).toBeDefined();
		expect(container.querySelector("[data-status]")?.getAttribute("data-status")).toBe(
			TOOL_STATUS.streaming,
		);
		// No anchor yet and no output yet: neither is invented.
		expect(container.querySelectorAll("pre")).toHaveLength(0);
	});

	test("a failure shows its message, never a bare spinner", () => {
		const { container } = render(
			<TranscriptEntry
				row={toolRow({ status: TOOL_STATUS.failed, output: "ENOENT: no such file" })}
			/>,
		);
		expect(screen.getByText(TOOL_STATUS_LABEL.failed)).toBeDefined();
		expect(container.querySelector("pre")?.textContent).toBe("ENOENT: no such file");
	});
});

describe("a subagent row", () => {
	const subagent = (input: string, over: Partial<ToolRow> = {}): ToolRow =>
		toolRow({ id: "tool_sub", name: SUBAGENT_TOOL_NAME, input, anchor: undefined, ...over });

	test("is the tool row whose subject is its description", () => {
		const input = JSON.stringify({
			agent: "builder",
			description: "Wire the rows",
			prompt: "…",
		});
		render(<TranscriptEntry row={subagent(input)} />);
		expect(screen.getByText(SUBAGENT_LABEL)).toBeDefined();
		expect(screen.getByText("Wire the rows")).toBeDefined();
	});

	test("falls back to its kind word while the input is still streaming", () => {
		const { container } = render(
			<TranscriptEntry row={subagent('{"agent":"bui', { status: TOOL_STATUS.streaming })} />,
		);
		expect(screen.getByText(SUBAGENT_LABEL)).toBeDefined();
		expect(container.textContent).not.toContain("bui");
	});

	test("names the child session it continues, when the input carries one", () => {
		const input = JSON.stringify({
			agent: "builder",
			description: "Continue",
			sessionID: "ses_x",
		});
		render(<TranscriptEntry row={subagent(input)} />);
		expect(screen.getByText("ses_x")).toBeDefined();
	});
});

describe("a shell row", () => {
	const shell = (over: Partial<ShellRow> = {}): ShellRow => ({
		id: "sh_1",
		created: 1,
		seq: 2,
		kind: ROW_KIND.shell,
		command: "echo hi",
		status: "exited",
		output: "hi\n",
		...over,
	});

	test("shows the command, its output and the server's own status", () => {
		const { container } = render(<TranscriptEntry row={shell()} />);
		expect(container.querySelector('[data-row="sh_1"]')).not.toBeNull();
		expect(screen.getByText(SHELL_LABEL)).toBeDefined();
		expect(screen.getByText("$ echo hi")).toBeDefined();
		expect(container.querySelector("pre")?.textContent).toBe("hi\n");
		expect(container.querySelector("[data-status]")?.getAttribute("data-status")).toBe(
			"exited",
		);
	});

	test("a status this build does not know is shown verbatim, never as done", () => {
		const { container } = render(<TranscriptEntry row={shell({ status: "suspended" })} />);
		expect(container.querySelector("[data-status]")?.getAttribute("data-status")).toBe(
			"suspended",
		);
		expect(screen.getByText("suspended")).toBeDefined();
	});
});

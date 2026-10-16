import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { TranscriptEntry } from "@/components/transcript/TranscriptEntry";
import { ROW_KIND, TOOL_STATUS, type ToolStatus } from "@/constants/transcript";
import { SHELL_LABEL, TOOL_STATUS_LABEL, TOOL_UNNAMED } from "@/constants/transcriptUi";
import { capPayload } from "@/session/payloadCaps";
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
	output: capPayload("line one\n"),
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
					output: capPayload(""),
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
				row={toolRow({
					status: TOOL_STATUS.failed,
					output: capPayload("ENOENT: no such file"),
				})}
			/>,
		);
		expect(screen.getByText(TOOL_STATUS_LABEL.failed)).toBeDefined();
		expect(container.querySelector("pre")?.textContent).toBe("ENOENT: no such file");
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
		output: capPayload("hi\n"),
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

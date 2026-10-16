import { describe, expect, test } from "bun:test";
import { rowCopyText, rowEditorTarget } from "@/components/transcript/rowCopy";
import { DEFAULT_EDITOR_LINE } from "@/constants/native";
import { ROW_KIND, TOOL_STATUS } from "@/constants/transcript";
import { capPayload } from "@/session/payloadCaps";
import type { ToolRow, TranscriptRow } from "@/session/transcript";

/**
 * The two pure derivations a row's affordances share (M5.2): the text a copy takes and
 * the file the editor opens. A button and a context-menu item both read these, so the
 * point of the test is that the row — and nothing else — decides both, and that an
 * editor target is never invented (a relative anchor is refused, not guessed).
 */

const base = { created: 1, seq: 1 } as const;

function toolRow(overrides: Partial<ToolRow> = {}): ToolRow {
	return {
		...base,
		id: "msg_a:t0",
		kind: ROW_KIND.tool,
		name: "read",
		input: "{}",
		status: TOOL_STATUS.ok,
		output: capPayload(""),
		...overrides,
	};
}

describe("rowCopyText is the row's own text, or null when it has none", () => {
	test("the text families copy their payload", () => {
		expect(
			rowCopyText({
				...base,
				id: "msg_a",
				kind: ROW_KIND.prose,
				text: capPayload("hello"),
				ended: true,
			}),
		).toBe("hello");
	});

	test("a tool copies what it produced, else what it was asked to do", () => {
		expect(rowCopyText(toolRow({ output: capPayload("done") }))).toBe("done");
		expect(rowCopyText(toolRow({ input: '{"path":"/a.ts"}', output: capPayload("") }))).toBe(
			'{"path":"/a.ts"}',
		);
	});

	test("a shell copies its output, else its command", () => {
		const row: TranscriptRow = {
			...base,
			id: "sh_a",
			kind: ROW_KIND.shell,
			command: "ls -la",
			status: "completed",
			output: capPayload(""),
		};
		expect(rowCopyText(row)).toBe("ls -la");
	});

	test("an empty row offers nothing to copy", () => {
		expect(
			rowCopyText({
				...base,
				id: "msg_a",
				kind: ROW_KIND.user,
				text: "",
				delivery: "queued",
			}),
		).toBeNull();
	});
});

describe("rowEditorTarget names a file the shell could really open", () => {
	test("only a tool row has a target", () => {
		expect(
			rowEditorTarget({
				...base,
				id: "msg_a",
				kind: ROW_KIND.user,
				text: "hello",
				delivery: "queued",
			}),
		).toBeNull();
	});

	test("a relative anchor is refused rather than guessed", () => {
		expect(rowEditorTarget(toolRow({ anchor: "src/a.ts" }))).toBeNull();
		expect(rowEditorTarget(toolRow())).toBeNull();
	});

	test("an absolute anchor opens at its own line, or the default one", () => {
		expect(rowEditorTarget(toolRow({ anchor: "/a.ts", input: '{"offset":"42"}' }))).toEqual({
			path: "/a.ts",
			line: 42,
		});
		expect(rowEditorTarget(toolRow({ anchor: "/a.ts", input: '{"offset":"0"}' }))?.line).toBe(
			DEFAULT_EDITOR_LINE,
		);
		expect(rowEditorTarget(toolRow({ anchor: "/a.ts", input: "{}" }))?.line).toBe(
			DEFAULT_EDITOR_LINE,
		);
	});
});

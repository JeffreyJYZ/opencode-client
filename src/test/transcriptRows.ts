import type { ComponentType } from "react";
import { ErrorRow as ErrorRowView } from "@/components/transcript/ErrorRow";
import { FooterRow as FooterRowView } from "@/components/transcript/FooterRow";
import { NoticeRow as NoticeRowView } from "@/components/transcript/NoticeRow";
import { ProseRow as ProseRowView } from "@/components/transcript/ProseRow";
import { ReasoningRow as ReasoningRowView } from "@/components/transcript/ReasoningRow";
import { ShellRow as ShellRowView } from "@/components/transcript/ShellRow";
import { ToolRow as ToolRowView } from "@/components/transcript/ToolRow";
import { UserBand } from "@/components/transcript/UserBand";
import { DELIVERY, ROW_KIND, TOOL_STATUS } from "@/constants/transcript";
import { capPayload } from "@/session/payloadCaps";
import type {
	ErrorRow,
	FooterRow,
	NoticeRow,
	ShellRow,
	TextRow,
	ToolRow,
	TranscriptRow,
	UserRow,
} from "@/session/transcript";

/**
 * One row of every transcript kind, and the built-in component each dispatches to
 * (M4.13). Shared by the dispatch tests so the two concerns — what a registered
 * renderer does, and what the built-ins do with nothing registered — build their
 * rows the same way and cannot drift.
 */

export const userRow = (): UserRow => ({
	id: "u1",
	created: 1,
	seq: 1,
	kind: ROW_KIND.user,
	text: "hello",
	delivery: DELIVERY.delivered,
});

export const textRow = (kind: TextRow["kind"], id: string): TextRow => ({
	id,
	created: 1,
	seq: 2,
	kind,
	text: capPayload("some text"),
	ended: true,
});

export const toolRow = (): ToolRow => ({
	id: "t1",
	created: 1,
	seq: 3,
	kind: ROW_KIND.tool,
	name: "read",
	input: '{"path":"src/a.ts"}',
	status: TOOL_STATUS.ok,
	output: capPayload("line one\n"),
	anchor: "src/a.ts",
});

export const shellRow = (): ShellRow => ({
	id: "s1",
	created: 1,
	seq: 4,
	kind: ROW_KIND.shell,
	command: "ls",
	status: "exited",
	output: capPayload("a\nb\n"),
});

export const errorRow = (): ErrorRow => ({
	id: "e1",
	created: 1,
	seq: 5,
	kind: ROW_KIND.error,
	message: "boom",
});

export const noticeRow = (): NoticeRow => ({
	id: "n1",
	created: 1,
	seq: 6,
	kind: ROW_KIND.notice,
	text: "Compacting context",
});

export const footerRow = (): FooterRow => ({
	id: "f1",
	created: 1,
	seq: 7,
	kind: ROW_KIND.footer,
	agent: "build",
	model: { id: "cat-jam-free", providerID: "opencode" },
	durationMs: 2000,
	outputTokens: 30,
});

/** Every row kind and its built-in component; `never` lets each one keep its own props. */
export const BUILTIN_ROW_CASES: ReadonlyArray<{
	readonly row: TranscriptRow;
	readonly builtin: ComponentType<{ row: never }>;
}> = [
	{ row: userRow(), builtin: UserBand },
	{ row: textRow(ROW_KIND.prose, "p1"), builtin: ProseRowView },
	{ row: textRow(ROW_KIND.reasoning, "r1"), builtin: ReasoningRowView },
	{ row: toolRow(), builtin: ToolRowView },
	{ row: shellRow(), builtin: ShellRowView },
	{ row: errorRow(), builtin: ErrorRowView },
	{ row: noticeRow(), builtin: NoticeRowView },
	{ row: footerRow(), builtin: FooterRowView },
];

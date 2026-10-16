import { afterEach, describe, expect, test } from "bun:test";
import type { McpServer, SessionInfo } from "@opencode/client";
import { cleanup, render, screen } from "@testing-library/react";
import { ContextPanel } from "@/components/sidebar/ContextPanel";
import { FilesPanel } from "@/components/sidebar/FilesPanel";
import { McpPanel } from "@/components/sidebar/McpPanel";
import { SessionPanel } from "@/components/sidebar/SessionPanel";
import { SubagentsPanel } from "@/components/sidebar/SubagentsPanel";
import { SIDEBAR_EMPTY } from "@/constants/sidebar";
import { formatSpend, formatTokens } from "@/session/amounts";
import type { SessionRow } from "@/session/useSessions";

/**
 * One test per panel family (M2.7): each panel is a pure function of its props,
 * so the assertion is that the figure it was handed is the figure it renders —
 * and that a panel with no data shows the empty state rather than a blank region.
 *
 * The Context panel's props are **this session's own** figures (M2.15), so the
 * assertions read them off `SESSION` — the same `SessionInfo` the statusline
 * shows — and never a `session.stats` aggregate.
 */

afterEach(cleanup);

const SESSION: SessionInfo = {
	id: "ses_root",
	projectID: "proj",
	cost: 3.32,
	tokens: { input: 111, output: 22, reasoning: 0, cache: { read: 1_111, write: 0 } },
	time: { created: 1, updated: Date.now() },
	title: "Chrome work",
	agent: "build",
	model: { id: "gpt-x", providerID: "openai" },
	location: { directory: "/tmp/m2728-project" },
};

const CHILD = {
	id: "ses_child",
	title: "researcher",
	time: { updated: 1 },
} as unknown as SessionRow;

describe("the sidebar panels", () => {
	test("Session shows the directory, branch, title, agent and model", () => {
		render(<SessionPanel data={{ info: SESSION, branch: "main" }} />);
		expect(screen.getByText("m2728-project")).toBeDefined();
		expect(screen.getByText("main")).toBeDefined();
		expect(screen.getByText("Chrome work")).toBeDefined();
		expect(screen.getByText("build")).toBeDefined();
		expect(screen.getByText("gpt-x")).toBeDefined();
	});

	test("Session shows the empty state before its read answers", () => {
		render(<SessionPanel data={{ info: null, branch: null }} />);
		expect(screen.getByText(SIDEBAR_EMPTY)).toBeDefined();
	});

	test("Context shows this session's own figures, and the context length", () => {
		render(
			<ContextPanel data={{ tokens: SESSION.tokens, cost: SESSION.cost, contextCount: 2 }} />,
		);
		expect(screen.getByText("In context")).toBeDefined();
		expect(screen.getByText("2")).toBeDefined();
		expect(screen.getByText(formatTokens(SESSION.tokens.input))).toBeDefined();
		expect(screen.getByText(formatTokens(SESSION.tokens.cache.read))).toBeDefined();
		expect(screen.getByText(formatSpend(SESSION.cost))).toBeDefined();
	});

	test("Context shows the empty state before its read answers", () => {
		render(<ContextPanel data={{ tokens: null, cost: null, contextCount: 0 }} />);
		expect(screen.getAllByText(SIDEBAR_EMPTY).length).toBeGreaterThanOrEqual(4);
	});

	test("Subagents lists the children and says an unfinished row is running", () => {
		render(
			<SubagentsPanel
				data={{ children: [CHILD] }}
				openSession={() => undefined}
				interrupt={() => undefined}
			/>,
		);
		expect(screen.getByText("researcher")).toBeDefined();
		expect(screen.getByText(/running/)).toBeDefined();
		cleanup();
		render(
			<SubagentsPanel
				data={{ children: [] }}
				openSession={() => undefined}
				interrupt={() => undefined}
			/>,
		);
		expect(screen.getByText(SIDEBAR_EMPTY)).toBeDefined();
	});

	test("MCP lists each server's status word and its error", () => {
		const servers: McpServer[] = [
			{ name: "srv", status: { status: "connected" } },
			{ name: "broken", status: { status: "failed", error: "boom" } },
		];
		render(
			<McpPanel
				data={{ servers }}
				expanded={null}
				onToggle={() => undefined}
				onConnect={() => undefined}
				onDisconnect={() => undefined}
				configPath={undefined}
			/>,
		);
		expect(screen.getByText("srv")).toBeDefined();
		expect(screen.getByText("connected")).toBeDefined();
		expect(screen.getByText(/boom/)).toBeDefined();
	});

	test("Files shows vcs.status' file, status and diff counts", () => {
		render(
			<FilesPanel
				data={{
					files: [
						{
							file: "/tmp/m2728-project/a.ts",
							additions: 12,
							deletions: 3,
							status: "modified",
						},
					],
				}}
			/>,
		);
		expect(screen.getByText("a.ts")).toBeDefined();
		expect(screen.getByText(/\+12/)).toBeDefined();
		expect(screen.getByText(/modified/)).toBeDefined();
	});
});

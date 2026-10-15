import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { OpenCodeClient, SessionInfo } from "@opencode/client";
import { cleanup, render, screen } from "@testing-library/react";
import { navigate, sessionRoute } from "@/app/router";
import { Statusline } from "@/components/statusline/Statusline";
import { STATUSLINE_HINT, STATUSLINE_LABEL } from "@/constants/statusline";
import { formatSpend, formatTokens, totalTokens } from "@/session/amounts";
import { ClientProvider } from "@/session/ClientProvider";
import { resetSettingsState } from "@/test/settings";

/**
 * M2.8's evidence, at the seam: **the branch appears after the location
 * resolves.** The location comes from `session.get` (one read); the branch is a
 * second, slower `vcs.get` (a bounded retry), so the location paints first and
 * `:branch` is appended when it lands — never a spinner in front of the location.
 */

const DIRECTORY = "/tmp/m2728-project";
const SESSION: SessionInfo = {
	id: "ses_root",
	projectID: "proj",
	cost: 3.32,
	tokens: { input: 100, output: 20, reasoning: 5, cache: { read: 1_000, write: 0 } },
	time: { created: 1, updated: 1 },
	location: { directory: DIRECTORY },
};

/** A `vcs.get` that answers `{"branch":{}}` once, then the real branch. */
function branchClient() {
	let calls = 0;
	const client = {
		session: { get: () => Promise.resolve(SESSION) },
		vcs: {
			get: () => {
				calls += 1;
				return Promise.resolve({
					location: { directory: DIRECTORY },
					data: { branch: { current: calls >= 2 ? "main" : undefined } },
				});
			},
		},
	} as unknown as OpenCodeClient;
	return client;
}

beforeEach(() => {
	resetSettingsState();
	navigate(sessionRoute(SESSION.id));
});
afterEach(cleanup);

describe("the statusline", () => {
	test("shows the location, then the branch once it resolves", async () => {
		render(
			<ClientProvider client={branchClient()} probe={() => Promise.resolve()}>
				<Statusline />
			</ClientProvider>,
		);
		// The location resolves first, with no branch yet.
		expect(await screen.findByText("m2728-project")).toBeDefined();
		expect(screen.queryByText("m2728-project: main")).toBeNull();
		// Then the bounded retry resolves it and the branch is appended.
		expect(await screen.findByText("m2728-project: main")).toBeDefined();
	});

	test("shows the session's own tokens and spend, and the idle hint", async () => {
		render(
			<ClientProvider client={branchClient()} probe={() => Promise.resolve()}>
				<Statusline />
			</ClientProvider>,
		);
		const tokens = `${formatTokens(totalTokens(SESSION.tokens))} tokens`;
		expect(await screen.findByText(tokens)).toBeDefined();
		expect(screen.getByText(formatSpend(SESSION.cost))).toBeDefined();
		expect(screen.getByText(STATUSLINE_HINT.idle)).toBeDefined();
		expect(screen.getByLabelText(STATUSLINE_LABEL)).toBeDefined();
	});

	test("renders nothing without an open session", () => {
		resetSettingsState();
		render(
			<ClientProvider client={branchClient()} probe={() => Promise.resolve()}>
				<Statusline />
			</ClientProvider>,
		);
		expect(screen.queryByLabelText(STATUSLINE_LABEL)).toBeNull();
	});
});

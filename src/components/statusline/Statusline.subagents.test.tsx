import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { OpenCodeClient } from "@opencode/client";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { navigate, sessionRoute } from "@/app/router";
import { resetActivity } from "@/app/sessionActivity";
import { setSidebarVisible } from "@/app/settings/sidebarActions";
import { sessionTab } from "@/app/tabModel";
import { openTab, resetTabs } from "@/app/tabs";
import {
	disposeSidebarBuiltins,
	registerSidebarBuiltins,
} from "@/components/sidebar/builtinPanels";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { Statusline } from "@/components/statusline/Statusline";
import {
	SUBAGENTS_SESSION_ID,
	statusSubagentsClient,
	subagentHistory,
} from "@/components/statusline/statusSubagentsFixture";
import { PANEL_ID_ATTRIBUTE } from "@/constants/panelDom";
import { TARGET_GLOBAL } from "@/constants/server";
import { SIDEBAR_PANEL } from "@/constants/sidebar";
import { STATUSLINE_LABEL, STATUSLINE_SEGMENT_TITLE } from "@/constants/statusline";
import { resetPanels } from "@/plugins/panels";
import { ClientProvider } from "@/session/ClientProvider";
import { resetSettingsState } from "@/test/settings";

/**
 * M2.21's evidence: the subagents segment opens the sidebar's Subagents panel —
 * hidden first, so the click must reveal, scroll and focus — and the segment is
 * absent at N = 0.
 */

function renderBoth(client: OpenCodeClient): void {
	render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<Sidebar />
			<Statusline />
		</ClientProvider>,
	);
}

beforeEach(() => {
	resetSettingsState();
	resetPanels();
	registerSidebarBuiltins();
	resetActivity();
	(globalThis as Record<string, unknown>)[TARGET_GLOBAL] = {
		url: "http://127.0.0.1:5251",
		password: "pw",
	};
	navigate(sessionRoute(SUBAGENTS_SESSION_ID));
	openTab(sessionTab(SUBAGENTS_SESSION_ID));
});

afterEach(() => {
	cleanup();
	disposeSidebarBuiltins();
	resetPanels();
	resetActivity();
	resetTabs();
	delete (globalThis as Record<string, unknown>)[TARGET_GLOBAL];
});

describe("the statusline's subagents segment (M2.21)", () => {
	test("a click reveals the hidden sidebar and focuses the Subagents panel", async () => {
		act(() => setSidebarVisible(false));
		renderBoth(statusSubagentsClient(subagentHistory()));
		expect(await screen.findByLabelText(STATUSLINE_LABEL)).toBeDefined();
		const segment = await screen.findByTitle(STATUSLINE_SEGMENT_TITLE.subagents);
		expect(
			document.querySelector(`[${PANEL_ID_ATTRIBUTE}="${SIDEBAR_PANEL.subagents}"]`),
		).toBeNull();
		fireEvent.click(segment);
		await waitFor(() => {
			expect(document.activeElement?.getAttribute(PANEL_ID_ATTRIBUTE)).toBe(
				SIDEBAR_PANEL.subagents,
			);
		});
	});

	test("the segment is absent when there are no subagents", async () => {
		renderBoth(statusSubagentsClient({}));
		expect(await screen.findByLabelText(STATUSLINE_LABEL)).toBeDefined();
		expect(screen.queryByTitle(STATUSLINE_SEGMENT_TITLE.subagents)).toBeNull();
	});
});

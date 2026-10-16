import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { OpenCodeClient, SessionInfo } from "@opencode/client";
import { cleanup, render, screen } from "@testing-library/react";
import { navigate, sessionRoute } from "@/app/router";
import {
	disposeSidebarBuiltins,
	registerSidebarBuiltins,
} from "@/components/sidebar/builtinPanels";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { SIDEBAR_LABEL, SIDEBAR_PANEL_LABEL } from "@/constants/sidebar";
import { SLOT } from "@/constants/slots";
import { clearFaults } from "@/plugins/faults";
import { resetPanels } from "@/plugins/panels";
import { ClientProvider } from "@/session/ClientProvider";
import { resetSettingsState } from "@/test/settings";
import { probeSlot, slotMarker } from "@/test/slotProbe";

/**
 * `session.sidebar.panels` (M4.12): the **slot** route into the panel column,
 * beside the `panels.register` **registry** M4.11 wired. The two are advertised
 * separately — the registry draws chrome from a registered `title`, the slot
 * renders a bare component — so this proves the slot renders where the registry
 * does, that the registry keeps its chrome and order, and that an empty slot adds
 * no node. The slot used to render nowhere while `slots.ts` and the reference
 * advertised it, which is the defect M4.12 closes.
 */

const DIRECTORY = "/tmp/m412-sidebar";

const SESSION: SessionInfo = {
	id: "ses_root",
	projectID: "proj",
	cost: 0,
	tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
	time: { created: 1, updated: 1 },
	location: { directory: DIRECTORY },
};

function fixtureClient(info: SessionInfo = SESSION): OpenCodeClient {
	return {
		session: {
			get: () => Promise.resolve(info),
			context: () => Promise.resolve([]),
			list: () => Promise.resolve({ data: [], cursor: {} }),
		},
		mcp: { list: () => Promise.resolve({ location: { directory: DIRECTORY }, data: [] }) },
		vcs: {
			status: () => Promise.resolve({ location: { directory: DIRECTORY }, data: [] }),
			get: () =>
				Promise.resolve({ location: { directory: DIRECTORY }, data: { branch: {} } }),
		},
	} as unknown as OpenCodeClient;
}

function renderSidebar(client: OpenCodeClient = fixtureClient()): void {
	render(
		<ClientProvider client={client} probe={() => Promise.resolve()}>
			<Sidebar />
		</ClientProvider>,
	);
}

/** The scroll column: the aside's only element child after the resize handle. */
function column(aside: HTMLElement): HTMLElement {
	const node = aside.lastElementChild;
	if (node === null) throw new Error("the sidebar has no panel column");
	return node as HTMLElement;
}

beforeEach(() => {
	resetSettingsState();
	resetPanels();
	clearFaults();
	navigate(sessionRoute(SESSION.id));
});

afterEach(cleanup);
afterEach(() => {
	disposeSidebarBuiltins();
	resetPanels();
});

describe("the sidebar's slot route", () => {
	test("a slot contribution renders in the panel column, bare", async () => {
		const probe = probeSlot(SLOT.sessionSidebarPanels);
		try {
			renderSidebar();
			const aside = await screen.findByLabelText(SIDEBAR_LABEL);
			const marker = screen.getByText(slotMarker(SLOT.sessionSidebarPanels));
			expect(column(aside).contains(marker)).toBe(true);
			// Bare: the slot draws no chrome, so no panel frame names the contribution.
			expect(
				screen.queryByRole("heading", { name: slotMarker(SLOT.sessionSidebarPanels) }),
			).toBeNull();
			expect(aside.querySelector("[data-slot]")).toBeNull();
		} finally {
			probe.dispose();
		}
	});

	test("the registry keeps its chrome and order, with the slot below", async () => {
		registerSidebarBuiltins();
		const probe = probeSlot(SLOT.sessionSidebarPanels);
		try {
			renderSidebar();
			const aside = await screen.findByLabelText(SIDEBAR_LABEL);
			for (const title of Object.values(SIDEBAR_PANEL_LABEL)) {
				expect(screen.getByRole("heading", { name: title })).toBeDefined();
			}
			// The five framed panels first, then the one bare slot contribution.
			const body = column(aside);
			expect(body.childElementCount).toBe(Object.keys(SIDEBAR_PANEL_LABEL).length + 1);
			expect(body.lastElementChild).toBe(
				screen.getByText(slotMarker(SLOT.sessionSidebarPanels)),
			);
		} finally {
			probe.dispose();
		}
	});

	test("adds no node when nothing is registered", async () => {
		renderSidebar();
		const aside = await screen.findByLabelText(SIDEBAR_LABEL);
		expect(column(aside).childElementCount).toBe(0);
		expect(screen.queryByText(slotMarker(SLOT.sessionSidebarPanels))).toBeNull();
	});
});

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getTabSnapshot, resetTabs } from "@/app/tabs";
import { ROUTE_PATH } from "@/constants/routes";
import { TARGET_GLOBAL } from "@/constants/server";
import { TAB_KIND } from "@/constants/tabs";
import { HomePage } from "@/pages/HomePage";
import { ClientProvider } from "@/session/ClientProvider";
import { fakeProbe } from "@/test/session";

/** RTL installs auto-cleanup once per process; every later importer needs its own. */
afterEach(cleanup);

const URL = "http://127.0.0.1:5211";

function setInjected(value: unknown): void {
	(globalThis as Record<string, unknown>)[TARGET_GLOBAL] = value;
}

beforeEach(() => {
	window.history.pushState(null, "", ROUTE_PATH.home);
	setInjected({ url: URL, password: "pw" });
	resetTabs();
});

afterEach(() => {
	delete (globalThis as Record<string, unknown>)[TARGET_GLOBAL];
	resetTabs();
});

function makeClient(sessions: unknown[], opts?: { listThrows?: boolean; version?: string }) {
	const version = opts?.version ?? "2.0.29";
	return {
		session: {
			list: (_arg: unknown) => {
				if (opts?.listThrows) return Promise.reject(new Error("boom"));
				return Promise.resolve({ data: sessions });
			},
		},
		server: { info: () => Promise.resolve({ version }) },
	} as unknown;
}

const rootSession = {
	id: "ses_root1",
	title: "Root one",
	parentID: undefined,
	projectID: "p",
	cost: 0,
	tokens: {},
	time: { created: 1, updated: Date.now() },
	location: { directory: "/repo/app" },
};
const childSession = {
	id: "ses_child1",
	title: "Child one",
	parentID: "ses_root1",
	projectID: "p",
	cost: 0,
	tokens: {},
	time: { created: 2, updated: Date.now() - 1000 },
	location: { directory: "/repo/app" },
};

function renderHome(sessions: unknown[], opts?: { listThrows?: boolean; version?: string }) {
	const client = makeClient(sessions, opts);
	const probe = fakeProbe("resolve");
	return render(
		<ClientProvider client={client as never} probe={probe.run}>
			<HomePage />
		</ClientProvider>,
	);
}

describe("HomePage", () => {
	test("root-only: a child session never renders, query uses parentID: null", async () => {
		let captured: unknown = null;
		const client = {
			session: {
				list: (_arg: unknown) => {
					captured = _arg;
					return Promise.resolve({ data: [rootSession, childSession] });
				},
			},
			server: { info: () => Promise.resolve({ version: "2.0.29" }) },
		};
		const probe = fakeProbe("resolve");
		render(
			<ClientProvider client={client as never} probe={probe.run}>
				<HomePage />
			</ClientProvider>,
		);
		expect(await screen.findByText("Root one")).toBeDefined();
		expect(screen.queryByText("Child one")).toBeNull();
		expect((captured as { parentID: unknown }).parentID).toBeNull();
	});

	test("empty state names the url and the server version", async () => {
		renderHome([]);
		const node = await screen.findByText(/Connected to/);
		expect(node.textContent).toContain(URL);
		expect(node.textContent).toContain("(v2.0.29)");
	});

	test("failed-list state is distinct from empty and names the target", async () => {
		renderHome([], { listThrows: true });
		const node = await screen.findByText(/Could not load sessions from/);
		expect(node.textContent).toContain(URL);
		expect(screen.queryByText(/Connected to/)).toBeNull();
	});

	test("clicking a recent row opens the tab and lands on its route", async () => {
		renderHome([rootSession]);
		const btn = await screen.findByText("Root one");
		act(() => fireEvent.click(btn));
		expect(window.location.pathname).toBe(`/session/${rootSession.id}`);
		const snap = getTabSnapshot();
		expect(snap.activeIndex >= 0).toBe(true);
		expect((snap.tabs[snap.activeIndex] as { id?: string }).id).toBe(rootSession.id);
	});

	test("settings entry opens the settings tab through the store", async () => {
		renderHome([]);
		await waitFor(() => expect(screen.queryByText(/Loading/)).toBeNull());
		const settingsBtn = screen.getByText("Settings");
		act(() => fireEvent.click(settingsBtn));
		expect(window.location.pathname).toBe(ROUTE_PATH.settings);
		const snap = getTabSnapshot();
		expect(snap.tabs.some((t: { kind: string }) => t.kind === TAB_KIND.settings)).toBe(true);
	});
});

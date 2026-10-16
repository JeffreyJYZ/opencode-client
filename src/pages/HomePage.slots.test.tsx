import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { resetTabs } from "@/app/tabs";
import { ROUTE_PATH } from "@/constants/routes";
import { TARGET_GLOBAL } from "@/constants/server";
import { HomePage } from "@/pages/HomePage";
import { register as registerPlugin } from "@/plugins/registry";
import type { SlotName } from "@/plugins/slots";
import { ClientProvider } from "@/session/ClientProvider";
import { flush } from "@/test/act";
import { fakeProbe } from "@/test/session";

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

function makeClient(sessions: unknown[]) {
	return {
		session: { list: () => Promise.resolve({ data: sessions }) },
		server: { info: () => Promise.resolve({ version: "2.0.29" }) },
	} as unknown;
}

function renderHome(sessions: unknown[]) {
	const client = makeClient(sessions);
	const probe = fakeProbe("resolve");
	return render(
		<ClientProvider client={client as never} probe={probe.run}>
			<HomePage />
		</ClientProvider>,
	);
}

describe("HomePage", () => {
	test("home slots empty render nothing", async () => {
		renderHome([]);
		// The session list is a promise chain, not a timer: drain it, never poll (M1.4d).
		await flush();
		expect(screen.queryByText(/Loading/)).toBeNull();
		// empty slotted regions contribute zero nodes beyond main; check specific markers absent
		expect(screen.queryByText("contrib-hero")).toBeNull();
		expect(screen.queryByText("contrib-widget")).toBeNull();
		expect(screen.queryByText("contrib-action")).toBeNull();
	});

	test("home slots render a contribution", async () => {
		const handles = [
			registerPlugin({
				id: "h-hero",
				slot: "home.hero" as SlotName,
				component: () => <span>contrib-hero</span>,
				order: 1,
			}),
			registerPlugin({
				id: "h-widget",
				slot: "home.widgets" as SlotName,
				component: () => <span>contrib-widget</span>,
				order: 1,
			}),
			registerPlugin({
				id: "h-action",
				slot: "home.actions" as SlotName,
				component: () => <span>contrib-action</span>,
				order: 1,
			}),
		];
		try {
			renderHome([]);
			await flush();
			expect(screen.getByText("contrib-hero")).toBeDefined();
			expect(screen.getByText("contrib-widget")).toBeDefined();
			expect(screen.getByText("contrib-action")).toBeDefined();
		} finally {
			handles.forEach((h) => {
				h.dispose();
			});
		}
	});
});

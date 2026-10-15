import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Providers } from "@/app/providers";
import { navigate, sessionRoute, settingsRoute } from "@/app/router";
import { Shell } from "@/app/Shell";
import { sessionTab } from "@/app/tabModel";
import { openTab, resetTabs } from "@/app/tabs";
import { disposeTopnavBuiltins, registerTopnavBuiltins } from "@/app/topnavBuiltins";
import { TopNav } from "@/components/TopNav";
import { ROUTE_PATH } from "@/constants/routes";
import { NEW_SESSION_LABEL, SETTINGS_TAB_LABEL } from "@/constants/tabs";
import { register } from "@/plugins/registry";

const SESSION_A = "ses_m11_nav_a";
const SESSION_B = "ses_m11_nav_b";

/** RTL installs auto-cleanup once per process; every later importer needs its own. */
afterEach(cleanup);

afterEach(() => {
	disposeTopnavBuiltins();
	resetTabs();
});

beforeEach(() => {
	window.history.pushState(null, "", ROUTE_PATH.home);
});

function renderNav() {
	return render(
		<Providers>
			<TopNav />
		</Providers>,
	);
}

describe("TopNav", () => {
	test("empty regions render nothing: no mark, no strip, no controls", () => {
		const { container } = renderNav();
		expect(container.querySelector("nav")).toBeDefined();
		expect(container.querySelectorAll('[role="tab"]').length).toBe(0);
		expect(container.querySelectorAll("button").length).toBe(0);
	});

	test("a registered contribution renders in each region", () => {
		const left = register({
			id: "m11-left",
			slot: "topnav.left",
			component: () => <i>left</i>,
		});
		const center = register({
			id: "m11-center",
			slot: "topnav.center",
			component: () => <i>center</i>,
		});
		const right = register({
			id: "m11-right",
			slot: "topnav.right",
			component: () => <i>right</i>,
		});
		try {
			renderNav();
			expect(screen.getByText("left")).toBeDefined();
			expect(screen.getByText("center")).toBeDefined();
			expect(screen.getByText("right")).toBeDefined();
		} finally {
			left.dispose();
			center.dispose();
			right.dispose();
		}
	});

	test("two session tabs switch by click and one closes", () => {
		registerTopnavBuiltins();
		act(() => {
			openTab(sessionTab(SESSION_A));
			openTab(sessionTab(SESSION_B));
		});
		renderNav();
		const tabs = screen.getAllByRole("tab");
		expect(tabs).toHaveLength(2);
		fireEvent.click(screen.getByText(SESSION_A));
		expect(window.location.pathname).toBe(`/session/${SESSION_A}`);
		fireEvent.click(screen.getAllByLabelText(`Close ${SESSION_B}`)[0]);
		expect(screen.queryByText(SESSION_B)).toBeNull();
		expect(screen.getByText(SESSION_A)).toBeDefined();
	});

	test("the settings tab appears at /settings and vanishes when closed", () => {
		registerTopnavBuiltins();
		render(
			<Providers>
				<Shell />
			</Providers>,
		);
		expect(screen.queryByText(SETTINGS_TAB_LABEL)).toBeNull();
		act(() => navigate(settingsRoute()));
		expect(screen.getByText(SETTINGS_TAB_LABEL)).toBeDefined();
		fireEvent.click(screen.getByLabelText(`Close ${SETTINGS_TAB_LABEL}`));
		expect(screen.queryByText(SETTINGS_TAB_LABEL)).toBeNull();
		expect(window.location.pathname).toBe(ROUTE_PATH.home);
	});

	test("the gear opens settings and + asks M1.3 instead of faking a session", () => {
		registerTopnavBuiltins();
		let requested = 0;
		const onRequest = () => {
			requested++;
		};
		window.addEventListener("oc:new-session", onRequest);
		try {
			render(
				<Providers>
					<Shell />
				</Providers>,
			);
			act(() => {
				openTab(sessionTab(SESSION_A));
			});
			fireEvent.click(screen.getByTitle("Settings"));
			expect(window.location.pathname).toBe(ROUTE_PATH.settings);
			fireEvent.click(screen.getByText(NEW_SESSION_LABEL));
			expect(requested).toBe(1);
			expect(window.location.pathname).toBe(ROUTE_PATH.settings);
		} finally {
			window.removeEventListener("oc:new-session", onRequest);
		}
	});

	test("a session route opens its tab through the sync", () => {
		registerTopnavBuiltins();
		render(
			<Providers>
				<Shell />
			</Providers>,
		);
		act(() => navigate(sessionRoute(SESSION_B)));
		expect(screen.getByText(SESSION_B)).toBeDefined();
	});
});

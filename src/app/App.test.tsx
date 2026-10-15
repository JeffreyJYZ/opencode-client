import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, render, screen } from "@testing-library/react";
import { App } from "@/app/App";
import { Providers } from "@/app/providers";
import { registerRoute } from "@/app/routeRegistry";
import { navigate, sessionRoute, settingsRoute } from "@/app/router";
import { ROUTE_KIND, ROUTE_PATH } from "@/constants/routes";

const SESSION_ID = "ses_m04_app";
const REGISTERED_PATH = "/m04-app-route";

/** RTL installs auto-cleanup once per process; every later importer needs its own. */
afterEach(cleanup);

beforeEach(() => {
	window.history.pushState(null, "", ROUTE_PATH.home);
});

describe("App", () => {
	test("renders the home page at the home path", () => {
		render(
			<Providers>
				<App />
			</Providers>,
		);
		expect(screen.getByText(ROUTE_KIND.home)).toBeDefined();
	});

	test("navigates to the session page and shows the session id", () => {
		render(<App />);
		act(() => navigate(sessionRoute(SESSION_ID)));
		expect(screen.getByText(new RegExp(SESSION_ID))).toBeDefined();
	});

	test("navigates to the settings page", () => {
		render(<App />);
		act(() => navigate(settingsRoute()));
		expect(screen.getByText(ROUTE_KIND.settings)).toBeDefined();
	});

	test("a registered route wins over the built-in switch", () => {
		const disposable = registerRoute({
			id: "m04-app-registered",
			path: REGISTERED_PATH,
			component: () => <p>plugin route</p>,
		});
		window.history.pushState(null, "", REGISTERED_PATH);
		render(<App />);
		expect(screen.getByText("plugin route")).toBeDefined();
		// Disposing it leaves the path unknown, so the switch falls back to home.
		act(() => disposable.dispose());
		expect(screen.getByText(ROUTE_KIND.home)).toBeDefined();
	});
});

describe("Providers", () => {
	test("composes nothing and renders its children unchanged", () => {
		const { container } = render(
			<Providers>
				<span>child</span>
			</Providers>,
		);
		expect(container.innerHTML).toBe("<span>child</span>");
	});
});

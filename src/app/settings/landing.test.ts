import { afterEach, describe, expect, test } from "bun:test";
import { restoreLandingRoute } from "@/app/settings/landing";
import { type SerializedTabs, sessionTab, settingsTab } from "@/app/tabModel";
import { openTab } from "@/app/tabs";
import { ROUTE_PATH } from "@/constants/routes";
import { openTabIds, resetSettingsState } from "@/test/settings";

/**
 * M1.5b: the document's own path beats `settings.lastRoute`.
 *
 * These drive `restoreLandingRoute` directly, with the document path set by hand,
 * so each branch is its own case: an explicit path the strip can serve, one it
 * cannot, and no explicit path at all.
 */

const ID = "ses_deep_link";

function goTo(path: string): void {
	window.history.replaceState(null, "", path);
}

function stripOf(tabs: SerializedTabs["tabs"]): SerializedTabs {
	return { tabs, activeIndex: tabs.length === 0 ? -1 : 0 };
}

afterEach(resetSettingsState);

describe("an explicit path wins over the stored route (M1.5b)", () => {
	test("a deep link with a servable tab lands on it and adds no tab", () => {
		resetSettingsState();
		openTab(sessionTab(ID));
		goTo(`/session/${ID}`);
		restoreLandingRoute(ROUTE_PATH.home, stripOf([sessionTab(ID)]));
		expect(window.location.pathname).toBe(`/session/${ID}`);
		expect(openTabIds()).toEqual([ID]);
	});

	test("a deep link whose tab is absent opens its own tab and lands on it", () => {
		resetSettingsState();
		goTo(`/session/${ID}`);
		restoreLandingRoute(ROUTE_PATH.home, stripOf([]));
		expect(window.location.pathname).toBe(`/session/${ID}`);
		expect(openTabIds()).toEqual([ID]);
	});

	test("a deep link to settings opens the settings tab", () => {
		resetSettingsState();
		goTo(ROUTE_PATH.settings);
		restoreLandingRoute(ROUTE_PATH.home, stripOf([]));
		expect(window.location.pathname).toBe(ROUTE_PATH.settings);
		expect(openTabIds()).toEqual([settingsTab().kind]);
	});

	test("an unknown explicit path is 'no path': the stored route is the fallback", () => {
		resetSettingsState();
		openTab(sessionTab(ID));
		goTo("/not-a-route");
		restoreLandingRoute(`/session/${ID}`, stripOf([sessionTab(ID)]));
		expect(window.location.pathname).toBe(`/session/${ID}`);
	});
});

describe("no explicit path: the stored route is the fallback, gated by the strip (M1.5)", () => {
	test("a stored route with a tab behind it is restored", () => {
		resetSettingsState();
		openTab(sessionTab(ID));
		goTo(ROUTE_PATH.home);
		restoreLandingRoute(`/session/${ID}`, stripOf([sessionTab(ID)]));
		expect(window.location.pathname).toBe(`/session/${ID}`);
	});

	test("a stored route with no tab behind it leaves the app on home", () => {
		resetSettingsState();
		goTo(ROUTE_PATH.home);
		restoreLandingRoute(`/session/${ID}`, stripOf([]));
		expect(window.location.pathname).toBe(ROUTE_PATH.home);
		expect(openTabIds()).toEqual([]);
	});
});

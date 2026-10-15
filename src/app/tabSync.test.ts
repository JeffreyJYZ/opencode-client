import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { sessionRoute } from "@/app/router";
import type { Tab } from "@/app/tabModel";
import { sessionTab } from "@/app/tabModel";
import { closeTabAndGo, ensureTabForRoute, tabToRoute } from "@/app/tabSync";
import { getTabSnapshot, openTab, resetTabs } from "@/app/tabs";
import { ROUTE_PATH, SESSION_PATH_PREFIX } from "@/constants/routes";
import { TAB_KIND } from "@/constants/tabs";

const A = "ses_sync_a";
const B = "ses_sync_b";

beforeEach(() => {
	resetTabs();
	window.history.pushState(null, "", ROUTE_PATH.home);
});

afterEach(() => {
	resetTabs();
});

describe("tabSync", () => {
	test("ensureTabForRoute opens the view a session route names", () => {
		ensureTabForRoute(sessionRoute(B));
		expect(getTabSnapshot().tabs.map((t) => (t.kind === "session" ? t.id : t.kind))).toContain(
			B,
		);
	});

	test("closeTabAndGo follows the store for a constructed tab", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		const constructed: Tab = { kind: TAB_KIND.session, id: B };
		closeTabAndGo(constructed);
		expect(window.location.pathname).toBe(`${SESSION_PATH_PREFIX}${A}`);
	});

	test("tabToRoute maps a session tab to its session route", () => {
		expect(tabToRoute(sessionTab(A)).kind).toBe("session");
	});

	test("closing a non-active constructed tab leaves the route alone", () => {
		openTab(sessionTab(A));
		openTab(sessionTab(B));
		openTab(sessionTab(A));
		const constructed: Tab = { kind: TAB_KIND.session, id: B };
		const before = window.location.pathname;
		closeTabAndGo(constructed);
		expect(window.location.pathname).toBe(before);
	});
});

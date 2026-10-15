import { beforeEach, describe, expect, test } from "bun:test";
import {
	currentPath,
	currentRoute,
	homeRoute,
	navigate,
	pathToRoute,
	routeToPath,
	sessionRoute,
	settingsRoute,
	subscribeToRoute,
} from "@/app/router";
import { ROUTE_KIND, ROUTE_PATH } from "@/constants/routes";

/** A session id shaped like the server's; the exact value does not matter here. */
const SESSION_ID = "ses_m04_router";

/** A path the router does not know. */
const UNKNOWN_PATH = "/nope/deeper";

const SESSION_PATH = `${ROUTE_PATH.session}/${SESSION_ID}`;

beforeEach(() => {
	// Enter at home whatever a previous file left in the session history: happy-dom's
	// `back()` is synchronous and stays inside this document, so this one push is
	// enough to make the step below deterministic.
	window.history.pushState(null, "", ROUTE_PATH.home);
});

describe("routeToPath", () => {
	test("writes every route", () => {
		expect(routeToPath(homeRoute())).toBe(ROUTE_PATH.home);
		expect(routeToPath(sessionRoute(SESSION_ID))).toBe(SESSION_PATH);
		expect(routeToPath(settingsRoute())).toBe(ROUTE_PATH.settings);
	});
});

describe("pathToRoute", () => {
	test("round-trips every route", () => {
		for (const route of [homeRoute(), sessionRoute(SESSION_ID), settingsRoute()]) {
			expect(pathToRoute(routeToPath(route))).toEqual(route);
		}
	});

	test("ignores a trailing separator", () => {
		expect(pathToRoute(`${ROUTE_PATH.settings}/`)).toEqual(settingsRoute());
	});

	test("returns null for a path it does not know", () => {
		expect(pathToRoute(UNKNOWN_PATH)).toBeNull();
		expect(pathToRoute(ROUTE_PATH.session)).toBeNull();
	});

	test("keeps a session id that contains a separator", () => {
		expect(pathToRoute(`${SESSION_PATH}/panel`)).toEqual(sessionRoute(`${SESSION_ID}/panel`));
	});
});

describe("navigate", () => {
	test("changes the route and the path", () => {
		expect(currentRoute().kind).toBe(ROUTE_KIND.home);
		navigate(sessionRoute(SESSION_ID));
		expect(currentPath()).toBe(SESSION_PATH);
		expect(currentRoute()).toEqual(sessionRoute(SESSION_ID));
	});

	test("an unknown path lands on home", () => {
		window.history.pushState(null, "", UNKNOWN_PATH);
		expect(currentRoute()).toEqual(homeRoute());
	});

	test("a popstate changes the route back, and forward again", () => {
		const seen: string[] = [];
		const unsubscribe = subscribeToRoute(() => seen.push(currentPath()));
		navigate(sessionRoute(SESSION_ID));
		window.history.back();
		expect(currentRoute()).toEqual(homeRoute());
		window.history.forward();
		expect(currentRoute()).toEqual(sessionRoute(SESSION_ID));
		expect(seen).toEqual([SESSION_PATH, ROUTE_PATH.home, SESSION_PATH]);
		unsubscribe();
	});
});

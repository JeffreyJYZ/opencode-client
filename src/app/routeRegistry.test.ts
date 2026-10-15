import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { ComponentType } from "react";
import { memo } from "react";
import {
	matchRegisteredRoute,
	type RouteContribution,
	registerRoute,
	subscribeToRouteRegistry,
} from "@/app/routeRegistry";
import { normalizePath } from "@/app/router";
import type { Disposable } from "@/plugins/disposable";
import { clearFaults, FAULT_AREAS, FAULT_REASONS, listFaults } from "@/plugins/faults";

const ROUTE_ID = "m04-route";

const ROUTE_PATH_SEGMENT = "/m04-plugin-route";
const UNKNOWN_PATH = "/m04-kernel";

const handle: ComponentType = () => null;

/** Every handle a test opened, disposed after it, so no file leaks into the next. */
const open: Disposable[] = [];

function track(disposable: Disposable): Disposable {
	open.push(disposable);
	return disposable;
}

function lastFault(): ReturnType<typeof listFaults>[number] | undefined {
	return listFaults().at(-1);
}

beforeEach(() => {
	clearFaults();
});

afterEach(() => {
	for (const disposable of open.splice(0)) disposable.dispose();
});

describe("registerRoute", () => {
	test("serves a path the built-in router does not know", () => {
		track(registerRoute({ id: ROUTE_ID, path: ROUTE_PATH_SEGMENT, component: handle }));
		expect(matchRegisteredRoute(ROUTE_PATH_SEGMENT)?.id).toBe(ROUTE_ID);
		expect(matchRegisteredRoute(`${ROUTE_PATH_SEGMENT}/`)?.id).toBe(ROUTE_ID);
		expect(matchRegisteredRoute(UNKNOWN_PATH)).toBeNull();
	});

	test("refuses a duplicate id without throwing", () => {
		track(registerRoute({ id: ROUTE_ID, path: ROUTE_PATH_SEGMENT, component: handle }));
		expect(() =>
			registerRoute({ id: ROUTE_ID, path: `${ROUTE_PATH_SEGMENT}-two`, component: handle }),
		).not.toThrow();
		expect(lastFault()?.reason).toBe(FAULT_REASONS.duplicateId);
		expect(matchRegisteredRoute(`${ROUTE_PATH_SEGMENT}-two`)).toBeNull();
	});

	test("refuses a duplicate path without throwing", () => {
		track(registerRoute({ id: ROUTE_ID, path: ROUTE_PATH_SEGMENT, component: handle }));
		expect(() =>
			registerRoute({ id: `${ROUTE_ID}-two`, path: ROUTE_PATH_SEGMENT, component: handle }),
		).not.toThrow();
		expect(lastFault()?.reason).toBe(FAULT_REASONS.duplicatePath);
		expect(matchRegisteredRoute(ROUTE_PATH_SEGMENT)?.id).toBe(ROUTE_ID);
	});

	test("refuses a malformed entry without throwing", () => {
		const malformed = [
			{ id: "", path: ROUTE_PATH_SEGMENT, component: handle },
			{ id: `${ROUTE_ID}-relative`, path: "settings", component: handle },
			{ id: `${ROUTE_ID}-no-component`, path: ROUTE_PATH_SEGMENT } as RouteContribution,
			{
				id: `${ROUTE_ID}-nonfunc`,
				path: ROUTE_PATH_SEGMENT,
				component: 42,
			} as unknown as RouteContribution,
		];
		for (const contribution of malformed) {
			expect(() => registerRoute(contribution)).not.toThrow();
			expect(lastFault()?.reason).toBe(FAULT_REASONS.malformedEntry);
			expect(lastFault()?.area).toBe(FAULT_AREAS.routes);
		}
		expect(matchRegisteredRoute(ROUTE_PATH_SEGMENT)).toBeNull();
	});

	test("accepts a React.memo component", () => {
		const memoComponent = memo(() => null);
		const disposable = track(
			registerRoute({
				id: `${ROUTE_ID}-memo`,
				path: `/m04-memo-route`,
				component: memoComponent,
			}),
		);
		expect(matchRegisteredRoute("/m04-memo-route")?.id).toBe(`${ROUTE_ID}-memo`);
		disposable.dispose();
	});

	test("refuses a built-in path without throwing", () => {
		expect(() =>
			registerRoute({ id: `${ROUTE_ID}-settings`, path: "/settings", component: handle }),
		).not.toThrow();
		expect(lastFault()?.reason).toBe(FAULT_REASONS.duplicatePath);
		expect(lastFault()?.area).toBe(FAULT_AREAS.routes);
		expect(matchRegisteredRoute("/settings")).toBeNull();
	});

	test("serves an unknown plugin path", () => {
		track(
			registerRoute({ id: `${ROUTE_ID}-plugin`, path: "/plugin/thing", component: handle }),
		);
		expect(matchRegisteredRoute("/plugin/thing")?.id).toBe(`${ROUTE_ID}-plugin`);
	});

	test("disposal removes exactly its own route", () => {
		const first = track(
			registerRoute({ id: ROUTE_ID, path: ROUTE_PATH_SEGMENT, component: handle }),
		);
		const second = track(
			registerRoute({ id: `${ROUTE_ID}-two`, path: UNKNOWN_PATH, component: handle }),
		);
		first.dispose();
		first.dispose();
		expect(matchRegisteredRoute(ROUTE_PATH_SEGMENT)).toBeNull();
		expect(matchRegisteredRoute(UNKNOWN_PATH)?.id).toBe(`${ROUTE_ID}-two`);
		expect(second).toBeDefined();
	});

	test("notifies subscribers on registration and disposal", () => {
		let notifications = 0;
		const unsubscribe = subscribeToRouteRegistry(() => notifications++);
		const disposable = track(
			registerRoute({ id: ROUTE_ID, path: ROUTE_PATH_SEGMENT, component: handle }),
		);
		expect(notifications).toBe(1);
		disposable.dispose();
		expect(notifications).toBe(2);
		unsubscribe();
	});
});

describe("normalizePath", () => {
	test("strips a trailing separator but never the root", () => {
		expect(normalizePath(`${ROUTE_PATH_SEGMENT}/`)).toBe(ROUTE_PATH_SEGMENT);
		expect(normalizePath("/")).toBe("/");
	});
});
